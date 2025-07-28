# Admin Frontend Dockerfile - Simple version
FROM nginx:alpine

# Copy nginx configuration
COPY frontends/admin/nginx.conf /etc/nginx/conf.d/default.conf

# Create basic HTML file (temporary)
RUN mkdir -p /usr/share/nginx/html && \
    echo '<!DOCTYPE html><html><head><title>GuardAnt Admin</title></head><body><h1>GuardAnt Admin Panel</h1><p>Starting up...</p></body></html>' > /usr/share/nginx/html/index.html

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]