# =============================================================================
# ClawBot Manager - Multi-stage Dockerfile for pnpm Monorepo
# =============================================================================
# Build targets:
#   - api: NestJS backend service
#   - web: Next.js frontend service
#
# Usage:
#   docker build --target api -t clawbot-api .
#   docker build --target web -t clawbot-web .
# =============================================================================

# -----------------------------------------------------------------------------
# Base stage: Common dependencies and pnpm setup
# -----------------------------------------------------------------------------
FROM uhub.service.ucloud.cn/pardx/node:24.1-slim AS base

# Install pnpm globally
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

# Install build dependencies for native modules
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# -----------------------------------------------------------------------------
# Dependencies stage: Install all dependencies
# -----------------------------------------------------------------------------
FROM base AS deps

# Copy package files for dependency installation
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./

# Copy all package.json files from workspaces
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/config/package.json ./packages/config/
COPY packages/constants/package.json ./packages/constants/
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/types/package.json ./packages/types/
COPY packages/ui/package.json ./packages/ui/
COPY packages/utils/package.json ./packages/utils/
COPY packages/validators/package.json ./packages/validators/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# -----------------------------------------------------------------------------
# Builder stage: Build all packages and apps
# -----------------------------------------------------------------------------
FROM deps AS builder

# Copy source code
COPY . .

# Generate Prisma client
RUN cd apps/api && pnpm db:generate

# Build all packages and apps
RUN pnpm build

# -----------------------------------------------------------------------------
# API Production stage: NestJS backend
# -----------------------------------------------------------------------------
FROM uhub.service.ucloud.cn/pardx/node:24.1-slim AS api

RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/config/package.json ./packages/config/
COPY packages/constants/package.json ./packages/constants/
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY packages/validators/package.json ./packages/validators/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built files from builder
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/node_modules/.prisma ./apps/api/node_modules/.prisma
COPY --from=builder /app/packages/config/dist ./packages/config/dist
COPY --from=builder /app/packages/constants/dist ./packages/constants/dist
COPY --from=builder /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/utils/dist ./packages/utils/dist
COPY --from=builder /app/packages/validators/dist ./packages/validators/dist

# Environment
ENV NODE_ENV=production
ENV PORT=3100

EXPOSE 3100

WORKDIR /app/apps/api

CMD ["node", "-r", "tsconfig-paths/register", "dist/apps/api/src/main"]

# -----------------------------------------------------------------------------
# Web Production stage: Next.js frontend
# -----------------------------------------------------------------------------
FROM uhub.service.ucloud.cn/pardx/node:24.1-slim AS web

RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/config/package.json ./packages/config/
COPY packages/constants/package.json ./packages/constants/
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/types/package.json ./packages/types/
COPY packages/ui/package.json ./packages/ui/
COPY packages/utils/package.json ./packages/utils/
COPY packages/validators/package.json ./packages/validators/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built files from builder
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/packages/config/dist ./packages/config/dist
COPY --from=builder /app/packages/constants/dist ./packages/constants/dist
COPY --from=builder /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/ui/dist ./packages/ui/dist
COPY --from=builder /app/packages/utils/dist ./packages/utils/dist
COPY --from=builder /app/packages/validators/dist ./packages/validators/dist

# Environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

WORKDIR /app/apps/web

CMD ["pnpm", "start"]
