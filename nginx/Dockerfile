FROM nginx:alpine

# Install diagnostic tools
RUN apk add --no-cache \
    curl \
    netcat-openbsd \
    procps \
    net-tools \
    bind-tools

# Remove default nginx config
RUN rm -f /etc/nginx/conf.d/default.conf

# Copy custom nginx configuration
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Create necessary directories
RUN mkdir -p /var/cache/nginx /var/log/nginx

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O- http://localhost/health || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]