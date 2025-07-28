# Production stage
FROM oven/bun:1

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN bun install

# Copy source code
COPY src ./src

# Environment variables
ENV NODE_ENV=production
ENV WORKER_ID=${HOSTNAME}

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD bun run src/health-check.ts || exit 1

# Start the worker
CMD ["bun", "run", "src/coordinator.ts"]