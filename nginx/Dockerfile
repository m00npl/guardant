FROM nginx:alpine

# Install diagnostic tools and openssl
RUN apk add --no-cache \
    curl \
    netcat-openbsd \
    procps \
    net-tools \
    bind-tools \
    openssl

# Remove default nginx config
RUN rm -f /etc/nginx/conf.d/default.conf

# Copy custom nginx configuration
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/subdomain.conf /etc/nginx/conf.d/subdomain.conf

# Create necessary directories
RUN mkdir -p /var/cache/nginx /var/log/nginx /etc/letsencrypt/live/guardant.me

# Generate self-signed certificate for development
RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/letsencrypt/live/guardant.me/privkey.pem \
    -out /etc/letsencrypt/live/guardant.me/fullchain.pem \
    -subj "/C=US/ST=State/L=City/O=GuardAnt/CN=*.guardant.me"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O- http://localhost/health || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]