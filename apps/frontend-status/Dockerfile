# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./
COPY apps/frontend-status/package.json ./apps/frontend-status/

# Install dependencies
RUN npm install -g bun && bun install

# Copy source code
COPY apps/frontend-status ./apps/frontend-status/
COPY packages ./packages/
COPY shared ./shared/
COPY tsconfig.json ./

# Build the app
WORKDIR /app/apps/frontend-status
RUN bun run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/apps/frontend-status/dist /usr/share/nginx/html

# Copy nginx config
COPY apps/frontend-status/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]