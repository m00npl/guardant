# Admin Frontend Dockerfile - Multi-stage build
# Stage 1: Build
FROM oven/bun:1 as builder

WORKDIR /app

# Copy package files
COPY frontends/admin/package*.json ./
COPY frontends/admin/tsconfig*.json ./
COPY frontends/admin/vite.config.ts ./
COPY frontends/admin/postcss.config.js ./
COPY frontends/admin/tailwind.config.js ./

# Install dependencies
RUN bun install

# Copy source files
COPY frontends/admin/index.html ./
COPY frontends/admin/src ./src

# Build the application
RUN bun run build

# Stage 2: Serve
FROM nginx:alpine

# Copy nginx configuration
COPY frontends/admin/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD nc -z localhost 80 || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]