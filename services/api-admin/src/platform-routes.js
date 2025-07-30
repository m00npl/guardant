"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.platformRoutes = void 0;
const hono_1 = require("hono");
const index_1 = require("/app/packages/auth-system/src/index");
exports.platformRoutes = new hono_1.Hono();
// Middleware to check platform admin access
const requirePlatformAdmin = async (c, next) => {
    const user = (0, index_1.getAuthUser)(c);
    if (!user || user.role !== 'platform_admin') {
        return c.json({
            success: false,
            error: 'Platform admin access required'
        }, 403);
    }
    await next();
};
// Apply middleware to all routes
exports.platformRoutes.use('/*', requirePlatformAdmin);
// Get all nests (organizations)
exports.platformRoutes.post('/nests/list', async (c) => {
    try {
        const body = await c.req.json();
        const { page = 1, limit = 20, search = '' } = body;
        const storage = c.get('storage');
        const nests = await storage.getAllNests(page, limit, search);
        return c.json({
            success: true,
            data: nests
        });
    }
    catch (error) {
        return c.json({
            success: false,
            error: error.message
        }, 500);
    }
});
// Get nest details with statistics
exports.platformRoutes.post('/nests/:nestId/details', async (c) => {
    try {
        const nestId = c.req.param('nestId');
        const storage = c.get('storage');
        const nest = await storage.getNest(nestId);
        if (!nest) {
            return c.json({
                success: false,
                error: 'Nest not found'
            }, 404);
        }
        // Get additional statistics
        const services = await storage.getServicesByNest(nestId);
        const users = await storage.getUsersByNest(nestId);
        return c.json({
            success: true,
            data: {
                nest,
                stats: {
                    servicesCount: services.length,
                    activeServices: services.filter(s => s.isActive).length,
                    usersCount: users.length,
                    activeUsers: users.filter(u => u.isActive).length,
                }
            }
        });
    }
    catch (error) {
        return c.json({
            success: false,
            error: error.message
        }, 500);
    }
});
// Get all users across platform
exports.platformRoutes.post('/users/list', async (c) => {
    try {
        const body = await c.req.json();
        const { page = 1, limit = 20, search = '', nestId = null } = body;
        const storage = c.get('storage');
        const users = await storage.getAllUsers(page, limit, search, nestId);
        return c.json({
            success: true,
            data: users
        });
    }
    catch (error) {
        return c.json({
            success: false,
            error: error.message
        }, 500);
    }
});
// Get platform statistics
exports.platformRoutes.post('/stats', async (c) => {
    try {
        const storage = c.get('storage');
        const paymentManager = c.get('paymentManager');
        // Get overall stats
        const totalNests = await storage.countAllNests();
        const totalUsers = await storage.countAllUsers();
        const totalServices = await storage.countAllServices();
        // Get subscription stats
        const subscriptionStats = await paymentManager.getPlatformSubscriptionStats();
        // Get activity stats for last 30 days
        const now = Date.now();
        const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
        const activeNests = await storage.countActiveNestsSince(thirtyDaysAgo);
        const newUsers = await storage.countUsersCreatedSince(thirtyDaysAgo);
        return c.json({
            success: true,
            data: {
                overview: {
                    totalNests,
                    totalUsers,
                    totalServices,
                    activeNests,
                    newUsers,
                },
                subscriptions: subscriptionStats,
                revenue: {
                    // TODO: Implement revenue tracking
                    monthly: 0,
                    annual: 0,
                    mrr: 0, // Monthly Recurring Revenue
                    arr: 0, // Annual Recurring Revenue
                }
            }
        });
    }
    catch (error) {
        return c.json({
            success: false,
            error: error.message
        }, 500);
    }
});
// Manage user status
exports.platformRoutes.post('/users/:userId/status', async (c) => {
    try {
        const userId = c.req.param('userId');
        const body = await c.req.json();
        const { isActive, reason } = body;
        const storage = c.get('storage');
        const authManager = c.get('authManager');
        // Update user status
        const updated = await storage.updateUserStatus(userId, isActive);
        if (!updated) {
            return c.json({
                success: false,
                error: 'User not found'
            }, 404);
        }
        // If deactivating, also invalidate all sessions
        if (!isActive) {
            await authManager.invalidateAllUserSessions(userId);
        }
        // Log the action
        const platformAdmin = (0, index_1.getAuthUser)(c);
        await storage.logPlatformAction({
            adminId: platformAdmin.sub,
            action: isActive ? 'user_activated' : 'user_deactivated',
            targetId: userId,
            reason,
            timestamp: Date.now()
        });
        return c.json({
            success: true,
            data: { message: `User ${isActive ? 'activated' : 'deactivated'} successfully` }
        });
    }
    catch (error) {
        return c.json({
            success: false,
            error: error.message
        }, 500);
    }
});
// Manage nest status
exports.platformRoutes.post('/nests/:nestId/status', async (c) => {
    try {
        const nestId = c.req.param('nestId');
        const body = await c.req.json();
        const { isActive, reason } = body;
        const storage = c.get('storage');
        // Update nest status
        const updated = await storage.updateNestStatus(nestId, isActive);
        if (!updated) {
            return c.json({
                success: false,
                error: 'Nest not found'
            }, 404);
        }
        // If deactivating, also deactivate all services
        if (!isActive) {
            await storage.deactivateAllNestServices(nestId);
        }
        // Log the action
        const platformAdmin = (0, index_1.getAuthUser)(c);
        await storage.logPlatformAction({
            adminId: platformAdmin.sub,
            action: isActive ? 'nest_activated' : 'nest_deactivated',
            targetId: nestId,
            reason,
            timestamp: Date.now()
        });
        return c.json({
            success: true,
            data: { message: `Nest ${isActive ? 'activated' : 'deactivated'} successfully` }
        });
    }
    catch (error) {
        return c.json({
            success: false,
            error: error.message
        }, 500);
    }
});
// Get platform activity logs
exports.platformRoutes.post('/logs', async (c) => {
    try {
        const body = await c.req.json();
        const { page = 1, limit = 50, action = null, adminId = null } = body;
        const storage = c.get('storage');
        const logs = await storage.getPlatformLogs(page, limit, action, adminId);
        return c.json({
            success: true,
            data: logs
        });
    }
    catch (error) {
        return c.json({
            success: false,
            error: error.message
        }, 500);
    }
});
// Manage subscriptions
exports.platformRoutes.post('/subscriptions/:nestId/override', async (c) => {
    try {
        const nestId = c.req.param('nestId');
        const body = await c.req.json();
        const { planId, duration, reason } = body;
        const paymentManager = c.get('paymentManager');
        const storage = c.get('storage');
        // Override subscription
        const result = await paymentManager.overrideSubscription(nestId, planId, duration);
        if (!result.success) {
            return c.json({
                success: false,
                error: result.error
            }, 400);
        }
        // Log the action
        const platformAdmin = (0, index_1.getAuthUser)(c);
        await storage.logPlatformAction({
            adminId: platformAdmin.sub,
            action: 'subscription_override',
            targetId: nestId,
            metadata: { planId, duration, reason },
            timestamp: Date.now()
        });
        return c.json({
            success: true,
            data: result.subscription
        });
    }
    catch (error) {
        return c.json({
            success: false,
            error: error.message
        }, 500);
    }
});
//# sourceMappingURL=platform-routes.js.map