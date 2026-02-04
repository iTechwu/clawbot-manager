# =============================================================================
# ClawBot Manager - Multi-stage Dockerfile for pnpm Monorepo
# =============================================================================
# Build targets:
#   - api: NestJS backend service
#   - web: Next.js frontend service
#
# Build args (由 .env 通过 docker-compose 传入):
#   BASE_NODE_IMAGE: Node.js 基础镜像
#
# Usage:
#   docker build --target api -t clawbot-api .
#   docker build --target web -t clawbot-web .
# =============================================================================

ARG BASE_NODE_IMAGE=node:24.1-slim

# -----------------------------------------------------------------------------
# Base stage: Common dependencies and pnpm setup
# -----------------------------------------------------------------------------
FROM ${BASE_NODE_IMAGE} AS base

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

# Install all dependencies (--ignore-scripts: postinstall 需要源码，在 builder 阶段执行)
RUN pnpm install --ignore-scripts

# -----------------------------------------------------------------------------
# Builder stage: Build all packages and apps
# -----------------------------------------------------------------------------
FROM deps AS builder

# Copy source code
COPY . .

# Run postinstall scripts that were skipped in deps stage
# apps/api postinstall: prisma generate && node scripts/link-prisma.js
RUN cd apps/api && pnpm exec prisma generate && node scripts/link-prisma.js

# Build all packages and apps
RUN pnpm build

# -----------------------------------------------------------------------------
# API Production stage: NestJS backend
# -----------------------------------------------------------------------------
FROM ${BASE_NODE_IMAGE} AS api

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

# Copy Prisma schema & scripts so postinstall (prisma generate && link-prisma) can run
COPY apps/api/prisma ./apps/api/prisma
COPY apps/api/scripts ./apps/api/scripts
COPY apps/api/prisma.config.ts ./apps/api/

# DATABASE_URL for prisma.config.ts (prisma generate): 优先从 apps/api/.env 读取，否则用 build-arg 或 .env.example
ARG DATABASE_URL
# .env* 会复制 .env.example 以及（若存在）apps/api/.env（.dockerignore 已放行 !apps/api/.env）
COPY apps/api/.env* ./apps/api/
RUN if [ -n "$DATABASE_URL" ]; then echo "DATABASE_URL=$DATABASE_URL" > ./apps/api/.env; elif [ ! -f ./apps/api/.env ]; then cp ./apps/api/.env.example ./apps/api/.env; fi

# 安装依赖（含 devDependencies 以安装 prisma CLI），再执行 prisma generate
# --ignore-scripts: 跳过 postinstall，手动执行 prisma generate
ENV NODE_ENV=development
RUN pnpm install --ignore-scripts \
  && cd apps/api && pnpm exec prisma generate && node scripts/link-prisma.js
ENV NODE_ENV=production

# Copy built files from builder
COPY --from=builder /app/apps/api/dist ./apps/api/dist
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
FROM ${BASE_NODE_IMAGE} AS web

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

# Install production dependencies only (--ignore-scripts: 跳过 postinstall，使用 builder 的预构建文件)
RUN pnpm install --ignore-scripts

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
