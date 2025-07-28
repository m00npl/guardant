# Admin API Dockerfile
FROM oven/bun:1.0-alpine

WORKDIR /app

# Copy everything
COPY . .

# Install all dependencies
RUN bun install --production

# Set working directory to service
WORKDIR /app/services/api-admin

# Expose port
EXPOSE 4000

# Run the application
CMD ["bun", "run", "src/index.ts"]