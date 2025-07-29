# Admin API Dockerfile
FROM oven/bun:1

WORKDIR /app

# Install build dependencies for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy everything at once
COPY . .

# Install all dependencies
RUN bun install

# Set working directory to service
WORKDIR /app/services/api-admin

# Verify the file exists and show endpoints
RUN echo "Checking if index.ts exists:" && ls -la src/index.ts && \
    echo "Checking for admin endpoints:" && \
    grep -n "/api/admin/services" src/index.ts | head -5 || echo "No admin endpoints found!"

# Expose port
EXPOSE 3002

# Add environment to help with debugging
ENV DOCKER=true

# Run the application directly
CMD ["bun", "src/index.ts"]