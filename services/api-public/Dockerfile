# Public API Dockerfile  
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
WORKDIR /app/services/api-public

# Set environment
ENV NODE_ENV=production
ENV PORT=4001

# Expose port
EXPOSE 4001

# Start the server
CMD ["bun", "src/index.ts"]