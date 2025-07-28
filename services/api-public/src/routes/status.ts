import { Hono } from 'hono';
// Removed zod dependencies for simplified development
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

// Get tracing instance
const tracing = getTracing('guardant-public-api');

const statusRoutes = new Hono();

// Test endpoint
statusRoutes.get('/test', async (c) => {
  return c.json({ message: 'Public API is working' });
});

export { statusRoutes };