import { Hono } from 'hono';
import { v4 as uuidv4 } from 'uuid';
import type { Redis } from 'ioredis';
import { createLogger } from '/app/shared/logger';
import dns from 'dns/promises';

const logger = createLogger('subdomain-routes');

interface SubdomainRouteConfig {
  redis: Redis;
  hybridStorage: any;
}

export const createSubdomainRoutes = ({ redis, hybridStorage }: SubdomainRouteConfig) => {
  const app = new Hono();

  // Helper to extract nestId from context
  const extractNestId = (c: any): string => {
    const user = c.get('user');
    if (!user?.nestId) {
      throw new Error('Unauthorized: No nest ID found');
    }
    return user.nestId;
  };

  // Check subdomain availability
  app.post('/check', async (c) => {
    try {
      const { subdomain } = await c.req.json();
      
      if (!subdomain || subdomain.length < 3) {
        return c.json({
          success: false,
          error: 'Subdomain must be at least 3 characters'
        }, 400);
      }

      // Validate subdomain format
      if (!/^[a-z0-9-]+$/.test(subdomain)) {
        return c.json({
          success: false,
          error: 'Subdomain can only contain lowercase letters, numbers, and hyphens'
        }, 400);
      }

      // Reserved subdomains
      const reserved = ['www', 'api', 'admin', 'status', 'app', 'mail', 'ftp', 'blog', 'shop', 'store'];
      if (reserved.includes(subdomain)) {
        return c.json({
          success: false,
          error: 'This subdomain is reserved'
        }, 400);
      }

      // Check if subdomain exists
      const existingNestId = await redis.get(`nest:subdomain:${subdomain}`);
      const available = !existingNestId;

      return c.json({
        success: true,
        data: { 
          subdomain,
          available,
          message: available ? 'Subdomain is available' : 'Subdomain is already taken'
        }
      });
    } catch (error: any) {
      logger.error('Failed to check subdomain availability', error);
      return c.json({
        success: false,
        error: error.message || 'Failed to check subdomain availability'
      }, 500);
    }
  });

  // Update subdomain
  app.post('/update', async (c) => {
    try {
      const nestId = extractNestId(c);
      const { newSubdomain } = await c.req.json();
      
      if (!newSubdomain || newSubdomain.length < 3) {
        return c.json({
          success: false,
          error: 'Subdomain must be at least 3 characters'
        }, 400);
      }

      // Validate format
      if (!/^[a-z0-9-]+$/.test(newSubdomain)) {
        return c.json({
          success: false,
          error: 'Invalid subdomain format'
        }, 400);
      }

      // Get current nest data
      const nest = await hybridStorage.getNest(nestId);
      if (!nest) {
        return c.json({
          success: false,
          error: 'Nest not found'
        }, 404);
      }

      // Check if new subdomain is available
      const existingNestId = await redis.get(`nest:subdomain:${newSubdomain}`);
      if (existingNestId && existingNestId !== nestId) {
        return c.json({
          success: false,
          error: 'Subdomain is already taken'
        }, 400);
      }

      // Update subdomain
      const oldSubdomain = nest.subdomain;
      nest.subdomain = newSubdomain;
      nest.updatedAt = Date.now();

      // Update in storage
      await hybridStorage.updateNest(nest);

      // Update Redis mappings
      const pipeline = redis.pipeline();
      pipeline.del(`nest:subdomain:${oldSubdomain}`);
      pipeline.set(`nest:subdomain:${newSubdomain}`, nestId);
      await pipeline.exec();

      // Log the change
      logger.info('Subdomain updated', {
        nestId,
        oldSubdomain,
        newSubdomain
      });

      return c.json({
        success: true,
        data: {
          oldSubdomain,
          newSubdomain,
          message: 'Subdomain updated successfully'
        }
      });
    } catch (error: any) {
      logger.error('Failed to update subdomain', error);
      return c.json({
        success: false,
        error: error.message || 'Failed to update subdomain'
      }, 500);
    }
  });

  // Verify custom domain
  app.post('/custom-domain/verify', async (c) => {
    try {
      const nestId = extractNestId(c);
      const { domain } = await c.req.json();
      
      if (!domain) {
        return c.json({
          success: false,
          error: 'Domain is required'
        }, 400);
      }

      // Get nest data
      const nest = await hybridStorage.getNest(nestId);
      if (!nest) {
        return c.json({
          success: false,
          error: 'Nest not found'
        }, 404);
      }

      // Check subscription tier
      if (nest.subscription.tier === 'free') {
        return c.json({
          success: false,
          error: 'Custom domains are only available for Pro and Unlimited plans'
        }, 403);
      }

      // Expected CNAME value
      const expectedCname = `${nest.subdomain}.guardant.me`;
      
      // DNS records to be configured
      const dnsRecords = [
        {
          type: 'CNAME',
          name: domain,
          value: expectedCname,
          ttl: 3600
        }
      ];

      // Try to verify DNS
      let verified = false;
      try {
        const records = await dns.resolveCname(domain);
        verified = records.some(record => 
          record.toLowerCase() === expectedCname.toLowerCase()
        );
      } catch (error) {
        // DNS lookup failed - domain not configured yet
        logger.info('DNS lookup failed for custom domain', { domain, error });
      }

      if (verified) {
        // Update nest with custom domain
        nest.settings.customDomain = domain;
        nest.updatedAt = Date.now();
        await hybridStorage.updateNest(nest);

        // Store custom domain mapping
        await redis.set(`nest:customdomain:${domain}`, nestId);
      }

      return c.json({
        success: true,
        data: {
          domain,
          verified,
          dnsRecords,
          message: verified 
            ? 'Custom domain verified and activated' 
            : 'Please configure DNS records and verify again'
        }
      });
    } catch (error: any) {
      logger.error('Failed to verify custom domain', error);
      return c.json({
        success: false,
        error: error.message || 'Failed to verify custom domain'
      }, 500);
    }
  });

  // Remove custom domain
  app.post('/custom-domain/remove', async (c) => {
    try {
      const nestId = extractNestId(c);
      
      // Get nest data
      const nest = await hybridStorage.getNest(nestId);
      if (!nest) {
        return c.json({
          success: false,
          error: 'Nest not found'
        }, 404);
      }

      const customDomain = nest.settings.customDomain;
      if (!customDomain) {
        return c.json({
          success: false,
          error: 'No custom domain configured'
        }, 400);
      }

      // Remove custom domain
      delete nest.settings.customDomain;
      nest.updatedAt = Date.now();
      await hybridStorage.updateNest(nest);

      // Remove mapping
      await redis.del(`nest:customdomain:${customDomain}`);

      return c.json({
        success: true,
        data: {
          message: 'Custom domain removed successfully',
          removedDomain: customDomain
        }
      });
    } catch (error: any) {
      logger.error('Failed to remove custom domain', error);
      return c.json({
        success: false,
        error: error.message || 'Failed to remove custom domain'
      }, 500);
    }
  });

  // Get subdomain suggestions
  app.post('/suggestions', async (c) => {
    try {
      const { baseName } = await c.req.json();
      
      if (!baseName) {
        return c.json({
          success: false,
          error: 'Base name is required'
        }, 400);
      }

      const cleanBase = baseName.toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      const suggestions = [];
      const suffixes = ['app', 'status', 'monitor', 'health', 'live', 'check'];
      const numbers = ['1', '2', '3', '01', '02'];

      // Check base name
      const baseExists = await redis.get(`nest:subdomain:${cleanBase}`);
      if (!baseExists) {
        suggestions.push(cleanBase);
      }

      // Try with suffixes
      for (const suffix of suffixes) {
        if (suggestions.length >= 5) break;
        const candidate = `${cleanBase}-${suffix}`;
        const exists = await redis.get(`nest:subdomain:${candidate}`);
        if (!exists) {
          suggestions.push(candidate);
        }
      }

      // Try with numbers
      for (const num of numbers) {
        if (suggestions.length >= 5) break;
        const candidate = `${cleanBase}${num}`;
        const exists = await redis.get(`nest:subdomain:${candidate}`);
        if (!exists) {
          suggestions.push(candidate);
        }
      }

      return c.json({
        success: true,
        data: {
          baseName: cleanBase,
          suggestions: suggestions.slice(0, 5)
        }
      });
    } catch (error: any) {
      logger.error('Failed to generate subdomain suggestions', error);
      return c.json({
        success: false,
        error: error.message || 'Failed to generate suggestions'
      }, 500);
    }
  });

  return app;
};