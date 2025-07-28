# Admin API Dockerfile
FROM oven/bun:1.0-alpine

WORKDIR /app

# Copy all package.json files first for better caching
COPY package.json ./
COPY services/api-admin/package.json ./services/api-admin/
COPY packages/auth-system/package.json ./packages/auth-system/
COPY packages/golem-base-l3/package.json ./packages/golem-base-l3/
COPY packages/payments/package.json ./packages/payments/
COPY packages/shared-types/package.json ./packages/shared-types/

# Install all dependencies
RUN cd services/api-admin && bun install

# Copy package source code
COPY packages ./packages/

# Build packages
RUN cd packages/shared-types && bun run build
RUN cd packages/auth-system && bun run build
RUN cd packages/golem-base-l3 && bun run build
RUN cd packages/payments && bun run build

# Copy service code
COPY services/api-admin/src ./services/api-admin/src
COPY services/api-admin/tsconfig.json ./services/api-admin/

# Copy shared modules
COPY shared ./shared/

# Set working directory to service
WORKDIR /app/services/api-admin

# Expose port
EXPOSE 4000

# Health check - removed for now (Alpine doesn't have curl/wget by default)

# Run the application
CMD ["bun", "run", "src/index.ts"]