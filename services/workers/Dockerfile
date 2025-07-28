# Build stage
FROM oven/bun:1 as builder

WORKDIR /app

# Copy package files
COPY package.json ./
COPY bun.lockb ./

# Copy workspace packages
COPY packages/ ./packages/
COPY services/workers/ ./services/workers/

# Install dependencies
RUN bun install --frozen-lockfile

# Build the application
WORKDIR /app/services/workers
RUN bun run build

# Production stage
FROM oven/bun:1-slim

WORKDIR /app

# Copy built application
COPY --from=builder /app/services/workers/dist/workers.js ./

# Copy node_modules for runtime dependencies
COPY --from=builder /app/node_modules ./node_modules

# Create non-root user
RUN addgroup -g 1001 -S guardant && \
    adduser -S guardant -u 1001

USER guardant

# Environment variables
ENV NODE_ENV=production
ENV WORKER_ID=${HOSTNAME}

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD bun healthcheck.js || exit 1

# Start the worker
CMD ["bun", "workers.js"]