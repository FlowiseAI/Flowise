FROM node:20-slim AS base

# This Dockerfile is optimized for Next.js standalone mode deployment
# Make sure you update both files if copying to documentation!

# Add metadata labels
LABEL maintainer="AnswerAI Team"
LABEL version="1.0.0"
LABEL description="AnswerAI Web Application"

WORKDIR /app

# Install essential tools for build process, pnpm, turbo, and configure pnpm store
RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    git \
    openssl \
    unzip \
    wget \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g pnpm turbo@1 \
    && pnpm config set store-dir /root/.pnpm-store

################################################################################

FROM base AS installer
WORKDIR /app

# Build arguments and environment variables
# BWS (Bitwarden Secrets) - commented for future use
# ARG BWS_ACCESS_TOKEN
# ENV BWS_ACCESS_TOKEN=$BWS_ACCESS_TOKEN

# Active build arguments and environment variables  
ARG AUTH0_BASE_URL
ENV AUTH0_BASE_URL=${AUTH0_BASE_URL:-http://localhost:3000}

# Use dummy DATABASE_URL for Prisma client generation during build
# This is only needed for prisma generate, the real DATABASE_URL comes from runtime secrets
ENV DATABASE_URL=postgresql://example_user:example_password@postgres:5432/example_db?schema=web&connection_limit=1

# Copy package files first for better layer caching
# Root workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Main web application
COPY apps/web/package.json ./apps/web/

# TheAnswer-specific packages
COPY packages-answers/db/package.json ./packages-answers/db/
COPY packages-answers/ui/package.json ./packages-answers/ui/
COPY packages-answers/utils/package.json ./packages-answers/utils/
COPY packages-answers/types/package.json ./packages-answers/types/
COPY packages-answers/experimental-prisma-webpack-plugin/package.json ./packages-answers/experimental-prisma-webpack-plugin/
COPY packages-answers/eslint-config-custom/package.json ./packages-answers/eslint-config-custom/
COPY packages-answers/tsconfig/package.json ./packages-answers/tsconfig/

# Flowise packages
COPY packages/ui/package.json ./packages/ui/
COPY packages/components/package.json ./packages/components/
COPY packages/embed/package.json ./packages/embed/

# Install dependencies (skip postinstall scripts for Docker build)
RUN --mount=type=cache,id=pnpm,target=/root/.pnpm-store pnpm install --ignore-scripts

# Copy source code (excluding unnecessary files via .dockerignore)
COPY . .

# Build the application
RUN --mount=type=cache,target=/app/node_modules/.cache turbo build --filter=web

# Cleanup build artifacts and unnecessary files
RUN find /app -name "*.map" -delete 2>/dev/null || true && \
    find /app -name "*.ts" -not -path "*/node_modules/*" -not -path "*/prisma/*" -delete 2>/dev/null || true && \
    find /app -name "*.tsx" -not -path "*/node_modules/*" -delete 2>/dev/null || true && \
    find /app -name "__tests__" -type d -exec rm -rf {} + 2>/dev/null || true && \
    find /app -name "*.test.*" -delete 2>/dev/null || true && \
    find /app -name "*.spec.*" -delete 2>/dev/null || true && \
    find /app -name "*.stories.*" -delete 2>/dev/null || true && \
    rm -rf /app/.next/cache /app/.turbo /app/docs /app/.git /app/scripts /app/copilot 2>/dev/null || true && \
    rm -rf /app/packages/docs /app/packages/api-documentation 2>/dev/null || true && \
    rm -rf /app/packages/components/nodes/*/test 2>/dev/null || true && \
    rm -rf /app/packages/components/nodes/*/tests 2>/dev/null || true && \
    find /app -name "README.md" -not -path "*/node_modules/*" -delete 2>/dev/null || true && \
    find /app -name "CHANGELOG.md" -not -path "*/node_modules/*" -delete 2>/dev/null || true && \
    find /app -name "LICENSE" -not -path "*/node_modules/*" -delete 2>/dev/null || true && \
    find /app -name ".eslintrc*" -delete 2>/dev/null || true && \
    find /app -name ".prettierrc*" -delete 2>/dev/null || true && \
    find /app -name "tsconfig.json" -not -path "*/node_modules/*" -delete 2>/dev/null || true && \
    find /app -name "webpack.config.*" -delete 2>/dev/null || true && \
    find /app -name "gulpfile.*" -delete 2>/dev/null || true && \
    find /app -name "rollup.config.*" -delete 2>/dev/null || true && \
    find /app -name "vite.config.*" -delete 2>/dev/null || true && \
    find /app -name "jest.config.*" -delete 2>/dev/null || true && \
    find /app -name "cypress.config.*" -delete 2>/dev/null || true && \
    find /app -name ".babelrc*" -delete 2>/dev/null || true && \
    find /app -name "babel.config.*" -delete 2>/dev/null || true

################################################################################

FROM node:20-slim AS runner
WORKDIR /app

# Install only runtime dependencies
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

# Copy Prisma schema and generated client for runtime migrations
COPY --from=installer --chown=nextjs:nodejs /app/packages-answers/db/prisma ./packages-answers/db/prisma
COPY --from=installer --chown=nextjs:nodejs /app/packages-answers/db/generated ./packages-answers/db/generated

# Install Prisma CLI globally for runtime migrations
RUN npm install -g prisma

# Copy minimal package.json for workspace resolution
COPY --from=installer --chown=nextjs:nodejs /app/package.json ./package.json

# Copy entrypoint.sh script
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/entrypoint.sh ./entrypoint.sh

# Update permissions for entrypoint.sh
RUN chmod +x entrypoint.sh

USER nextjs

# Build arguments for port configuration
ARG PORT=3000
ENV PORT=$PORT

EXPOSE $PORT

ENV NUMBER_OF_PROXIES="1"
ENV HOSTNAME="0.0.0.0"

# Use Node.js entrypoint to parse DATABASE_SECRET, run migration, and start server
CMD ["sh", "entrypoint.sh"]
