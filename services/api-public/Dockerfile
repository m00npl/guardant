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

# Health check - removed for now

# Expose port
EXPOSE 4001

# Start the server
CMD ["bun", "src/index.ts"]