# Admin Frontend Dockerfile - Multi-stage build
# Stage 1: Build
FROM oven/bun:1 as builder

WORKDIR /app

# Copy root package files for workspace
COPY package.json bun.lockb* ./
COPY tsconfig.json ./

# Copy workspace packages
COPY packages packages/

# Copy app files
COPY apps/frontend-admin apps/frontend-admin/

# Change to app directory
WORKDIR /app/apps/frontend-admin

# Install dependencies
RUN bun install

# Build the application
RUN bun run build

# Stage 2: Serve
FROM nginx:alpine

# Copy built files from builder stage
COPY --from=builder /app/apps/frontend-admin/dist /usr/share/nginx/html

# Copy nginx configuration
COPY apps/frontend-admin/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD nc -z localhost 80 || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]