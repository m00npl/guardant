# Admin API Dockerfile
FROM oven/bun:1

WORKDIR /app

# Install build dependencies for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files first
COPY package.json bun.lockb ./
COPY services/api-admin/package.json ./services/api-admin/
COPY packages/*/package.json ./packages/*/
COPY shared/package.json ./shared/

# Install all dependencies
RUN bun install

# Then copy all source code
COPY . .

# Set working directory to service
WORKDIR /app/services/api-admin

# Verify the file exists and show endpoints
RUN echo "Checking if index.ts exists:" && ls -la src/index.ts && \
    echo "Checking for admin endpoints:" && \
    grep -n "/api/admin/services" src/index.ts | head -5 || echo "No admin endpoints found!"

# Expose port
EXPOSE 45678

# Add environment to help with debugging
ENV DOCKER=true

# Run the application directly
CMD ["bun", "src/index.ts"]