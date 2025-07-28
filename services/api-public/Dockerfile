# Use Bun runtime
FROM oven/bun:1 as base

WORKDIR /app

# Copy all package.json files first for better caching
COPY package.json ./
COPY services/api-public/package.json ./services/api-public/
COPY packages/auth-system/package.json ./packages/auth-system/
COPY packages/golem-base-l3/package.json ./packages/golem-base-l3/
COPY packages/payments/package.json ./packages/payments/
COPY packages/shared-types/package.json ./packages/shared-types/

# Install all dependencies
RUN cd services/api-public && bun install

# Copy package source code
COPY packages ./packages/

# Build packages
RUN cd packages/shared-types && bun run build
RUN cd packages/auth-system && bun run build
RUN cd packages/golem-base-l3 && bun run build
RUN cd packages/payments && bun run build

# Copy service code
COPY services/api-public/src ./services/api-public/src
COPY services/api-public/tsconfig.json ./services/api-public/

# Copy shared modules
COPY shared ./shared/

# Set working directory to service
WORKDIR /app/services/api-public

# Set environment
ENV NODE_ENV=production
ENV PORT=4001

# Health check - removed for now

# Expose port
EXPOSE 4001

# Start the server
CMD ["bun", "src/index.ts"]