# Production stage
FROM oven/bun:1

WORKDIR /app

# Copy package files
COPY services/workers/package.json ./

# Install dependencies
RUN bun install

# Copy source code
COPY services/workers/src ./src

# Environment variables
ENV NODE_ENV=production
ENV WORKER_ID=${HOSTNAME}

# Health check - removed for now

# Start the worker
CMD ["bun", "run", "src/coordinator.ts"]