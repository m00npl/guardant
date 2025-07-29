# Scheduler Dockerfile
FROM oven/bun:1

WORKDIR /app

# Copy everything
COPY . .

# Install all dependencies
RUN bun install

# Set working directory to service
WORKDIR /app/services/scheduler

# Environment variables
ENV NODE_ENV=production

# Start the scheduler
CMD ["bun", "run", "src/index.ts"]