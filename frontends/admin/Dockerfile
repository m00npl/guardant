# Admin Frontend Dockerfile

# Build stage
FROM oven/bun:1.0-alpine AS builder

WORKDIR /app

# Copy package files
COPY frontends/admin/package.json ./

# Install dependencies
RUN bun install

# Copy source code
COPY frontends/admin/. .

# Build the application
RUN bun run build

# Production stage
FROM nginx:alpine

# Copy nginx configuration
COPY frontends/admin/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]