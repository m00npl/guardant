# Admin API Dockerfile
FROM oven/bun:1

WORKDIR /app

# Install build dependencies for native modules and diagnostic tools
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    procps \
    net-tools \
    lsof \
    netcat-openbsd \
    curl \
    ca-certificates \
    gnupg \
    lsb-release \
    && curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null \
    && apt-get update \
    && apt-get install -y docker-ce-cli docker-compose-plugin \
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