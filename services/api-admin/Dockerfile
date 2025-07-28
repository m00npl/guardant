# Admin API Dockerfile
FROM oven/bun:1.0-alpine

WORKDIR /app

# Copy package files
COPY services/api-admin/package.json ./

# Install dependencies
RUN bun install

# Copy application code
COPY services/api-admin/src ./src
COPY services/api-admin/tsconfig.json ./

# Note: shared modules will be mounted as volumes in docker-compose

# Expose port
EXPOSE 4000

# Health check - removed for now (Alpine doesn't have curl/wget by default)

# Run the application
CMD ["bun", "run", "src/index.ts"]