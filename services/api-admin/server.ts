#!/usr/bin/env bun
// Alternative server starter to work around Bun port binding issues in Docker

import app from './src/index';

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOSTNAME = process.env.HOSTNAME || '0.0.0.0';

console.log(`🚀 Starting server on ${HOSTNAME}:${PORT}...`);

try {
  // Simple server configuration
  const server = Bun.serve({
    port: PORT,
    hostname: HOSTNAME,
    fetch: app.fetch,
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
  
} catch (error) {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
}