# Admin API Dockerfile
FROM oven/bun:1

WORKDIR /app

# Copy everything
COPY . .

# Install all dependencies
RUN bun install

# Set working directory to service
WORKDIR /app/services/api-admin

# Expose port
EXPOSE 4000

# Add environment to help with debugging
ENV DOCKER=true

# Run the application
CMD ["bun", "run", "src/index.ts"]