# Production stage
FROM oven/bun:1

WORKDIR /app

# Copy all package.json files first for better caching
COPY package.json ./
COPY services/workers/package.json ./services/workers/
COPY packages/auth-system/package.json ./packages/auth-system/
COPY packages/golem-base-l3/package.json ./packages/golem-base-l3/
COPY packages/payments/package.json ./packages/payments/
COPY packages/shared-types/package.json ./packages/shared-types/

# Install all dependencies
RUN cd services/workers && bun install

# Copy package source code
COPY packages ./packages/

# Build packages
RUN cd packages/shared-types && bun run build
RUN cd packages/auth-system && bun run build
RUN cd packages/golem-base-l3 && bun run build
RUN cd packages/payments && bun run build

# Copy service code
COPY services/workers/src ./services/workers/src

# Copy shared modules
COPY shared ./shared/

# Set working directory to service
WORKDIR /app/services/workers

# Environment variables
ENV NODE_ENV=production
ENV WORKER_ID=${HOSTNAME}

# Health check - removed for now

# Start the worker
CMD ["bun", "run", "src/coordinator.ts"]