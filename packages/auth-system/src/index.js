"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasRole = exports.hasPermission = exports.getAuthPermissions = exports.getAuthUser = exports.createApiKeyMiddleware = exports.createRateLimitMiddleware = exports.createNestOwnershipMiddleware = exports.createRoleMiddleware = exports.createPermissionMiddleware = exports.createAuthMiddleware = exports.RedisAuthStorage = exports.AuthManager = void 0;
// Main auth system exports
var auth_manager_1 = require("./auth-manager");
Object.defineProperty(exports, "AuthManager", { enumerable: true, get: function () { return auth_manager_1.AuthManager; } });
var redis_storage_1 = require("./redis-storage");
Object.defineProperty(exports, "RedisAuthStorage", { enumerable: true, get: function () { return redis_storage_1.RedisAuthStorage; } });
var hono_middleware_1 = require("./hono-middleware");
Object.defineProperty(exports, "createAuthMiddleware", { enumerable: true, get: function () { return hono_middleware_1.createAuthMiddleware; } });
Object.defineProperty(exports, "createPermissionMiddleware", { enumerable: true, get: function () { return hono_middleware_1.createPermissionMiddleware; } });
Object.defineProperty(exports, "createRoleMiddleware", { enumerable: true, get: function () { return hono_middleware_1.createRoleMiddleware; } });
Object.defineProperty(exports, "createNestOwnershipMiddleware", { enumerable: true, get: function () { return hono_middleware_1.createNestOwnershipMiddleware; } });
Object.defineProperty(exports, "createRateLimitMiddleware", { enumerable: true, get: function () { return hono_middleware_1.createRateLimitMiddleware; } });
Object.defineProperty(exports, "createApiKeyMiddleware", { enumerable: true, get: function () { return hono_middleware_1.createApiKeyMiddleware; } });
Object.defineProperty(exports, "getAuthUser", { enumerable: true, get: function () { return hono_middleware_1.getAuthUser; } });
Object.defineProperty(exports, "getAuthPermissions", { enumerable: true, get: function () { return hono_middleware_1.getAuthPermissions; } });
Object.defineProperty(exports, "hasPermission", { enumerable: true, get: function () { return hono_middleware_1.hasPermission; } });
Object.defineProperty(exports, "hasRole", { enumerable: true, get: function () { return hono_middleware_1.hasRole; } });
//# sourceMappingURL=index.js.map