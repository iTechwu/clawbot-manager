# Build stage
FROM uhub.service.ucloud.cn/pardx/node:24.1-slim AS builder

WORKDIR /app

# Install build dependencies for native modules (better-sqlite3)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
COPY dashboard/package*.json ./dashboard/

# Install dependencies
RUN npm ci
RUN cd dashboard && npm ci

# Copy source
COPY . .

# Build
RUN npm run build
RUN cd dashboard && npm run build

# Production stage
FROM uhub.service.ucloud.cn/pardx/node:24.1-slim

WORKDIR /app

# Install build dependencies for native modules (better-sqlite3) and debugging tools
RUN apt-get update && apt-get install -y python3 make g++ curl && rm -rf /var/lib/apt/lists/*

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dashboard/dist ./dashboard/dist

# Create data directories
RUN mkdir -p /app/data /app/secrets

# Environment
ENV NODE_ENV=production
ENV PORT=7100
ENV DATA_DIR=/app/data
ENV SECRETS_DIR=/app/secrets

EXPOSE 7100

CMD ["node", "dist/index.js"]
