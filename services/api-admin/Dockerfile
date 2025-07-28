# Admin API Dockerfile
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
WORKDIR /app/services/api-admin

# Expose port
EXPOSE 45678

# Add environment to help with debugging
ENV DOCKER=true

# Run the application directly
CMD ["bun", "src/index.ts"]