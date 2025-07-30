# Admin Frontend Dockerfile - Multi-stage build
# Stage 1: Build
FROM oven/bun:1 as builder

WORKDIR /app

# Copy package files
COPY apps/frontend-admin/package*.json ./
COPY apps/frontend-admin/tsconfig*.json ./
COPY apps/frontend-admin/vite.config.ts ./
COPY apps/frontend-admin/tailwind.config.js ./

# Install dependencies
RUN bun install

# Copy source files
COPY apps/frontend-admin/index.html ./
COPY apps/frontend-admin/src ./src

# Build the application
RUN bun run build

# Stage 2: Serve
FROM nginx:alpine

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration if exists
COPY apps/frontend-admin/nginx.conf /etc/nginx/conf.d/default.conf || echo "No custom nginx config"

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD nc -z localhost 80 || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]