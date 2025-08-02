import { Hono } from 'hono';
import { redisService } from '../utils/redis';
import {
  transformNestData,
  transformServiceData,
  transformIncidentData,
  transformMaintenanceData,
  createServiceNameMap,
  filterPrivateData,
  generateMockHistoricalData,
} from '../utils/transformers';
import { cacheProfiles } from '../middleware/cache';
import { getTracing } from '../../../../shared/tracing';
import type { 
  ApiResponse, 
  PublicStatusPageResponse,
  PublicHistoricalData,
  SSEUpdateData 
} from '../types';

const tracing = getTracing('guardant-public-api');
const statusRoutes = new Hono();

/**
 * GET /api/status/:subdomain
 * Get status page data for a subdomain
 */
statusRoutes.get('/:subdomain', cacheProfiles.status, async (c) => {
  const requestLogger = c.get('logger');
  const { subdomain } = c.req.param();
  
  // Also check for X-Nest-Subdomain header (from nginx)
  const headerSubdomain = c.req.header('X-Nest-Subdomain') || c.req.header('X-Subdomain');
  const finalSubdomain = subdomain || headerSubdomain;
  
  return tracing.traceBusinessEvent('status_page_request', async (span) => {
    try {
      span.setAttributes({
        'guardant.request.subdomain': finalSubdomain || 'unknown',
        'guardant.request.type': 'status_page',
      });
      
      if (!finalSubdomain) {
        span.addEvent('status_page_request_failed', { reason: 'missing_subdomain' });
        return c.json<ApiResponse>({
          success: false,
          error: 'Subdomain is required',
          timestamp: Date.now(),
        }, 400);
      }
      
      requestLogger.info('Status page requested', { subdomain: finalSubdomain });
      
      // Get nest data
      const nestData = await tracing.traceDbOperation('get', 'nest_by_subdomain', async (dbSpan) => {
        dbSpan.setAttributes({ 'guardant.subdomain': finalSubdomain });
        return await redisService.getNestBySubdomain(finalSubdomain);
      });
      
      if (!nestData) {
        span.addEvent('status_page_request_failed', { reason: 'nest_not_found' });
        return c.json<ApiResponse>({
          success: false,
          error: 'Status page not found',
          timestamp: Date.now(),
        }, 404);
      }

      // Check if nest is public
      if (!nestData.settings?.isPublic) {
        return c.json<ApiResponse>({
          success: false,
          error: 'This status page is private',
          timestamp: Date.now(),
        }, 403);
      }

      // Get all services for this nest
      const servicesData = await redisService.getAllServiceStatuses(nestData.id);
      
      // Get incidents
      const incidentsData = await redisService.getIncidents(nestData.id, 30);
      
      // Get maintenance windows
      const maintenanceData = await redisService.getMaintenanceWindows(nestData.id);
      
      // Create service name lookup map
      const serviceNameMap = createServiceNameMap(servicesData);
      
      // Transform data for public API
      const response: PublicStatusPageResponse = {
        nest: transformNestData(nestData),
        services: servicesData.map(service => transformServiceData(service)),
        incidents: incidentsData.map(incident => transformIncidentData(incident, serviceNameMap)),
        maintenance: maintenanceData.map(maintenance => transformMaintenanceData(maintenance, serviceNameMap)),
        lastUpdated: Date.now(),
      };

      // Apply privacy filters
      const filteredResponse = filterPrivateData(response);

      return c.json<ApiResponse<PublicStatusPageResponse>>({
        success: true,
        data: filteredResponse,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Error fetching status page data:', error);
      return c.json<ApiResponse>({
        success: false,
        error: 'Internal server error',
        timestamp: Date.now(),
      }, 500);
    }
  });
});

/**
 * POST /api/status/page
 * Alternative endpoint for status page data (for backward compatibility)
 */
statusRoutes.post('/page', cacheProfiles.status, async (c) => {
  const requestLogger = c.get('logger');
  
  return tracing.traceBusinessEvent('status_page_request', async (span) => {
    try {
      const body = await c.req.json();
      const { subdomain } = body;
      
      span.setAttributes({
        'guardant.request.subdomain': subdomain || 'unknown',
        'guardant.request.type': 'status_page',
      });
      
      if (!subdomain) {
        span.addEvent('status_page_request_failed', { reason: 'missing_subdomain' });
        return c.json<ApiResponse>({
          success: false,
          error: 'Subdomain is required',
          timestamp: Date.now(),
        }, 400);
      }
      
      requestLogger.info('Status page requested', { subdomain });
      
      const nestData = await tracing.traceDbOperation('get', 'nest_by_subdomain', async (dbSpan) => {
        dbSpan.setAttributes({ 'guardant.subdomain': subdomain });
        return await redisService.getNestBySubdomain(subdomain);
      });
      
      if (!nestData) {
        span.addEvent('status_page_request_failed', { reason: 'nest_not_found' });
        return c.json<ApiResponse>({
          success: false,
          error: 'Colony not found',
          timestamp: Date.now(),
        }, 404);
      }

      if (!nestData.settings?.isPublic) {
        return c.json<ApiResponse>({
          success: false,
          error: 'This colony is private',
          timestamp: Date.now(),
        }, 403);
      }

      const servicesData = await redisService.getAllServiceStatuses(nestData.id);
      const incidentsData = await redisService.getIncidents(nestData.id, 30);
      const maintenanceData = await redisService.getMaintenanceWindows(nestData.id);
      const serviceNameMap = createServiceNameMap(servicesData);
      
      const response: PublicStatusPageResponse = {
        nest: transformNestData(nestData),
        services: servicesData.map(service => transformServiceData(service)),
        incidents: incidentsData.map(incident => transformIncidentData(incident, serviceNameMap)),
        maintenance: maintenanceData.map(maintenance => transformMaintenanceData(maintenance, serviceNameMap)),
        lastUpdated: Date.now(),
      };

      const filteredResponse = filterPrivateData(response);

      return c.json<ApiResponse<PublicStatusPageResponse>>({
        success: true,
        data: filteredResponse,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Error fetching status page data:', error);
      return c.json<ApiResponse>({
        success: false,
        error: 'Internal server error',
        timestamp: Date.now(),
      }, 500);
    }
  });
});

/**
 * GET /api/status/:subdomain/history/:serviceId
 * Get historical data for a specific service
 */
statusRoutes.get('/:subdomain/history/:serviceId', cacheProfiles.history, async (c) => {
  try {
    const { subdomain, serviceId } = c.req.param();
    const { period = '7d' } = c.req.query();
    
    const nestData = await redisService.getNestBySubdomain(subdomain);
    if (!nestData) {
      return c.json<ApiResponse>({
        success: false,
        error: 'Colony not found',
        timestamp: Date.now(),
      }, 404);
    }

    if (!nestData.settings?.isPublic) {
      return c.json<ApiResponse>({
        success: false,
        error: 'This colony is private',
        timestamp: Date.now(),
      }, 403);
    }

    const serviceStatus = await redisService.getServiceStatus(nestData.id, serviceId);
    if (!serviceStatus) {
      return c.json<ApiResponse>({
        success: false,
        error: 'Service not found',
        timestamp: Date.now(),
      }, 404);
    }

    const historicalData = generateMockHistoricalData(
      period,
      serviceStatus.status || 'up',
      serviceStatus.responseTime || 200
    );

    const response: PublicHistoricalData = {
      serviceId,
      serviceName: serviceStatus.name,
      period,
      data: historicalData,
    };

    return c.json<ApiResponse<PublicHistoricalData>>({
      success: true,
      data: response,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error fetching historical data:', error);
    return c.json<ApiResponse>({
      success: false,
      error: 'Internal server error',
      timestamp: Date.now(),
    }, 500);
  }
});

/**
 * GET /api/status/:subdomain/events
 * Server-Sent Events endpoint for real-time updates
 */
statusRoutes.get('/:subdomain/events', async (c) => {
  const { subdomain } = c.req.param();
  
  try {
    const nestData = await redisService.getNestBySubdomain(subdomain);
    if (!nestData) {
      return c.text('Colony not found', 404);
    }

    if (!nestData.settings?.isPublic) {
      return c.text('This colony is private', 403);
    }

    c.header('Content-Type', 'text/event-stream');
    c.header('Cache-Control', 'no-cache');
    c.header('Connection', 'keep-alive');
    c.header('Access-Control-Allow-Origin', '*');

    const stream = new ReadableStream({
      start(controller) {
        const initMessage = `data: ${JSON.stringify({
          type: 'connected',
          timestamp: Date.now(),
        })}\n\n`;
        controller.enqueue(new TextEncoder().encode(initMessage));

        const unsubscribe = redisService.subscribeToSSEUpdates(nestData.id, (updateData: SSEUpdateData) => {
          const message = `data: ${JSON.stringify(updateData)}\n\n`;
          controller.enqueue(new TextEncoder().encode(message));
        });

        const heartbeatInterval = setInterval(() => {
          const heartbeat = `data: ${JSON.stringify({
            type: 'heartbeat',
            timestamp: Date.now(),
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(heartbeat));
        }, 30000);

        c.req.raw.signal?.addEventListener('abort', () => {
          clearInterval(heartbeatInterval);
          unsubscribe();
          controller.close();
        });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error setting up SSE:', error);
    return c.text('Internal server error', 500);
  }
});

/**
 * GET /api/status/:subdomain/widget.js
 * JavaScript widget for embedding status on external sites  
 */
statusRoutes.get('/:subdomain/widget.js', async (c) => {
  try {
    const { subdomain } = c.req.param();
    const { theme = 'light', services = 'all', compact = 'false' } = c.req.query();
    
    const nestData = await redisService.getNestBySubdomain(subdomain);
    if (!nestData) {
      const errorWidget = `
        console.error('GuardAnt Widget Error: Colony "${subdomain}" not found');
        document.addEventListener('DOMContentLoaded', function() {
          var containers = document.querySelectorAll('[data-guardant="${subdomain}"]');
          containers.forEach(function(container) {
            container.innerHTML = '<div style="color: #ef4444; padding: 12px; border: 1px solid #ef4444; border-radius: 4px;">Status widget not found</div>';
          });
        });
      `;
      c.header('Content-Type', 'application/javascript');
      c.header('Cache-Control', 'public, max-age=300');
      return c.text(errorWidget);
    }

    if (!nestData.settings?.isPublic) {
      const privateWidget = `
        console.error('GuardAnt Widget Error: Colony "${subdomain}" is private');
        document.addEventListener('DOMContentLoaded', function() {
          var containers = document.querySelectorAll('[data-guardant="${subdomain}"]');
          containers.forEach(function(container) {
            container.innerHTML = '<div style="color: #6b7280; padding: 12px; border: 1px solid #d1d5db; border-radius: 4px;">Private status page</div>';
          });
        });
      `;
      c.header('Content-Type', 'application/javascript');
      c.header('Cache-Control', 'public, max-age=300');
      return c.text(privateWidget);
    }

    const widgetJS = generateWidgetJS(subdomain, {
      theme,
      services: services === 'all' ? [] : services.split(','),
      compact: compact === 'true',
      apiUrl: process.env.PUBLIC_API_URL || 'https://guardant.me'
    });

    c.header('Content-Type', 'application/javascript');
    c.header('Cache-Control', 'public, max-age=300');
    c.header('Access-Control-Allow-Origin', '*');
    return c.text(widgetJS);
  } catch (error) {
    console.error('Error generating widget:', error);
    const errorWidget = `console.error('GuardAnt Widget Error: ${error.message}');`;
    c.header('Content-Type', 'application/javascript');
    return c.text(errorWidget);
  }
});

// Widget JS generator function
function generateWidgetJS(subdomain: string, options: {
  theme: string;
  services: string[];
  compact: boolean;
  apiUrl: string;
}): string {
  return `
(function() {
  'use strict';
  
  // GuardAnt Status Widget v1.0
  var apiUrl = '${options.apiUrl}';
  var subdomain = '${subdomain}';
  var theme = '${options.theme}';
  var compact = ${options.compact};
  var services = ${JSON.stringify(options.services)};
  
  function loadWidget() {
    var containers = document.querySelectorAll('[data-guardant="' + subdomain + '"]');
    
    containers.forEach(function(container) {
      // Fetch status data
      fetch(apiUrl + '/api/status/' + subdomain)
        .then(function(response) { return response.json(); })
        .then(function(data) {
          if (data.success) {
            renderWidget(container, data.data);
          } else {
            renderError(container, data.error || 'Failed to load status');
          }
        })
        .catch(function(error) {
          renderError(container, 'Failed to load status widget');
        });
    });
  }
  
  function renderWidget(container, data) {
    var styles = getStyles();
    var html = compact ? renderCompactWidget(data) : renderFullWidget(data);
    
    // Inject styles if not already present
    if (!document.getElementById('guardant-widget-styles')) {
      var styleElement = document.createElement('style');
      styleElement.id = 'guardant-widget-styles';
      styleElement.textContent = styles;
      document.head.appendChild(styleElement);
    }
    
    container.innerHTML = html;
  }
  
  function renderCompactWidget(data) {
    var overallStatus = calculateOverallStatus(data.services);
    var statusColor = getStatusColor(overallStatus);
    var statusText = getStatusText(overallStatus);
    
    return '<div class="guardant-widget guardant-compact guardant-' + theme + '">' +
      '<div class="guardant-widget-header">' +
        '<div class="guardant-status-indicator" style="background-color: ' + statusColor + ';"></div>' +
        '<span class="guardant-nest-name">' + data.nest.name + '</span>' +
        '<span class="guardant-status-text" style="color: ' + statusColor + ';">' + statusText + '</span>' +
      '</div>' +
      '<div class="guardant-widget-subtitle">' + data.services.length + ' services monitored</div>' +
    '</div>';
  }
  
  function renderFullWidget(data) {
    var overallStatus = calculateOverallStatus(data.services);
    var statusColor = getStatusColor(overallStatus);
    var statusText = getStatusText(overallStatus);
    
    var servicesHtml = '';
    var displayServices = services.length > 0 
      ? data.services.filter(function(s) { return services.indexOf(s.id) > -1; })
      : data.services;
    
    displayServices.forEach(function(service) {
      var serviceColor = getStatusColor(service.status);
      var serviceText = getStatusText(service.status);
      servicesHtml += '<div class="guardant-service-row">' +
        '<span class="guardant-service-name">' + service.name + '</span>' +
        '<span class="guardant-service-status" style="color: ' + serviceColor + ';">' + serviceText + '</span>' +
      '</div>';
    });
    
    return '<div class="guardant-widget guardant-full guardant-' + theme + '">' +
      '<div class="guardant-widget-header guardant-widget-header-full">' +
        '<h3 class="guardant-widget-title">' + data.nest.name + ' Status</h3>' +
        '<div class="guardant-overall-status">' +
          '<div class="guardant-status-indicator" style="background-color: ' + statusColor + ';"></div>' +
          '<span class="guardant-status-text" style="color: ' + statusColor + ';">' + statusText + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="guardant-services-list">' + servicesHtml + '</div>' +
      '<div class="guardant-widget-footer">' +
        '<a href="https://' + subdomain + '.guardant.me" target="_blank" class="guardant-view-full">View full status page →</a>' +
      '</div>' +
    '</div>';
  }
  
  function renderError(container, error) {
    container.innerHTML = '<div class="guardant-widget guardant-error">' + error + '</div>';
  }
  
  function calculateOverallStatus(services) {
    if (services.length === 0) return 'unknown';
    var hasDown = services.some(function(s) { return s.status === 'down'; });
    var hasDegraded = services.some(function(s) { return s.status === 'degraded'; });
    if (hasDown) return 'down';
    if (hasDegraded) return 'degraded';
    return 'up';
  }
  
  function getStatusColor(status) {
    switch(status) {
      case 'up': return '#10b981';
      case 'down': return '#ef4444';
      case 'degraded': return '#f59e0b';
      case 'maintenance': return '#3b82f6';
      default: return '#6b7280';
    }
  }
  
  function getStatusText(status) {
    switch(status) {
      case 'up': return 'Operational';
      case 'down': return 'Down';
      case 'degraded': return 'Degraded';
      case 'maintenance': return 'Maintenance';
      default: return 'Unknown';
    }
  }
  
  function getStyles() {
    return '.guardant-widget { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; border-radius: 8px; border: 1px solid; padding: 12px; font-size: 13px; line-height: 1.4; }' +
      '.guardant-widget.guardant-light { background: #ffffff; color: #111827; border-color: #d1d5db; }' +
      '.guardant-widget.guardant-dark { background: #1f2937; color: #f9fafb; border-color: #374151; }' +
      '.guardant-widget-header { display: flex; align-items: center; gap: 8px; }' +
      '.guardant-widget-header-full { justify-content: space-between; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid; }' +
      '.guardant-widget.guardant-light .guardant-widget-header-full { border-color: #e5e7eb; }' +
      '.guardant-widget.guardant-dark .guardant-widget-header-full { border-color: #374151; }' +
      '.guardant-status-indicator { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }' +
      '.guardant-widget-header-full .guardant-status-indicator { width: 10px; height: 10px; }' +
      '.guardant-nest-name { font-weight: 500; }' +
      '.guardant-widget-title { margin: 0; font-size: 16px; font-weight: 600; }' +
      '.guardant-widget-subtitle { font-size: 11px; opacity: 0.7; margin-top: 2px; }' +
      '.guardant-overall-status { display: flex; align-items: center; gap: 6px; }' +
      '.guardant-status-text { font-weight: 500; }' +
      '.guardant-services-list { margin: 0 -12px; }' +
      '.guardant-service-row { display: flex; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid; }' +
      '.guardant-widget.guardant-light .guardant-service-row { border-color: #e5e7eb; }' +
      '.guardant-widget.guardant-dark .guardant-service-row { border-color: #374151; }' +
      '.guardant-service-row:last-child { border-bottom: none; }' +
      '.guardant-service-status { font-weight: 500; }' +
      '.guardant-widget-footer { text-align: center; margin-top: 12px; padding-top: 12px; border-top: 1px solid; }' +
      '.guardant-widget.guardant-light .guardant-widget-footer { border-color: #e5e7eb; }' +
      '.guardant-widget.guardant-dark .guardant-widget-footer { border-color: #374151; }' +
      '.guardant-view-full { color: #6366f1; text-decoration: none; font-size: 12px; }' +
      '.guardant-view-full:hover { text-decoration: underline; }' +
      '.guardant-widget.guardant-error { color: #ef4444; border-color: #ef4444; }' +
      '.guardant-widget.guardant-compact { max-width: 300px; }' +
      '.guardant-widget.guardant-full { max-width: 400px; }';
  }
  
  // Initialize widget when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadWidget);
  } else {
    loadWidget();
  }
})();
`;
}

export { statusRoutes };