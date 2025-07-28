# Use Bun runtime
FROM oven/bun:1 as base

WORKDIR /app

# Copy package files
COPY services/api-public/package.json ./

# Install dependencies
RUN bun install

# Copy source code
COPY services/api-public/src ./src
COPY services/api-public/tsconfig.json ./tsconfig.json

# Set environment
ENV NODE_ENV=production
ENV PORT=4001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4001/health || exit 1

# Expose port
EXPOSE 4001

# Start the server
CMD ["bun", "src/index.ts"]