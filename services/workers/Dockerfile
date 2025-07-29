# Workers Dockerfile
FROM oven/bun:1

WORKDIR /app

# Install build dependencies for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy everything
COPY . .

# Install all dependencies
RUN bun install

# Set working directory to service
WORKDIR /app/services/workers

# Environment variables
ENV NODE_ENV=production
ENV WORKER_ID=${HOSTNAME}

# Start the worker
CMD ["bun", "run", "src/index.ts"]