"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.statusRoutes = void 0;
const hono_1 = require("hono");
const tracing_1 = require("../../../../shared/tracing");
// Get tracing instance
const tracing = (0, tracing_1.getTracing)('guardant-public-api');
const statusRoutes = new hono_1.Hono();
exports.statusRoutes = statusRoutes;
// Test endpoint
statusRoutes.get('/test', async (c) => {
    return c.json({ message: 'Public API is working' });
});
//# sourceMappingURL=status.js.map