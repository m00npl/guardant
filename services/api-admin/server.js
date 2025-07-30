#!/usr/bin/env bun
"use strict";
// Alternative server starter to work around Bun port binding issues in Docker
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = __importDefault(require("./src/index"));
const PORT = parseInt(process.env.PORT || '3001', 10);
const HOSTNAME = process.env.HOSTNAME || '0.0.0.0';
console.log(`🚀 Starting server on ${HOSTNAME}:${PORT}...`);
try {
    // Simple server configuration
    const server = Bun.serve({
        port: PORT,
        hostname: HOSTNAME,
        fetch: index_1.default.fetch,
        error(error) {
            console.error('Server error:', error);
            return new Response('Internal Server Error', { status: 500 });
        },
    });
    console.log(`✅ Server is running at ${server.url}`);
    console.log(`✅ Admin API ready on port ${server.port}`);
    // Handle graceful shutdown
    process.on('SIGTERM', () => {
        console.log('Shutting down server...');
        server.stop();
        process.exit(0);
    });
}
catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
}
//# sourceMappingURL=server.js.map