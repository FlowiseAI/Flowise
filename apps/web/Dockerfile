FROM --platform=linux/amd64 node:20-alpine AS base

# This Dockerfile is optimized for Next.js standalone mode deployment
# Make sure you update both files if copying to documentation!

WORKDIR /app

# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
# Install dependencies required by Prisma ORM for Alpine Linux
# Ref: https://www.prisma.io/docs/orm/reference/system-requirements#linux-runtime-dependencies
RUN apk add --no-cache \
    libc6-compat \
    openssl \
    ca-certificates \
    zlib \
    libgcc
RUN apk update

# Install PNPM globally
RUN npm install -g pnpm turbo@1
RUN pnpm config set store-dir ~/.pnpm-store

################################################################################

# Prune projects
FROM base AS pruner

COPY . .
RUN turbo prune web --docker

################################################################################

# Add lockfile and package.json's of isolated subworkspace
FROM base AS installer
WORKDIR /app

# Accept build arguments for Auth0 configuration
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ARG NEXT_PUBLIC_GOOGLE_DEVELOPER_KEY
ARG AUTH0_BASE_URL
#ARG AUTH0_SECRET
#ARG AUTH0_ISSUER_BASE_URL
#ARG AUTH0_CLIENT_ID
#ARG AUTH0_CLIENT_SECRET
#ARG AUTH0_AUDIENCE
#ARG AUTH0_ORGANIZATION_ID
#ARG AUTH0_DOMAIN
#ARG FLAGSMITH_ENVIRONMENT_ID
#ARG WEB_AUTH0_SECRET

# Set them as environment variables for the build
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID
ENV NEXT_PUBLIC_GOOGLE_DEVELOPER_KEY=$NEXT_PUBLIC_GOOGLE_DEVELOPER_KEY
ENV AUTH0_BASE_URL=$AUTH0_BASE_URL
#ENV AUTH0_SECRET=$AUTH0_SECRET
#ENV AUTH0_ISSUER_BASE_URL=$AUTH0_ISSUER_BASE_URL
#ENV AUTH0_CLIENT_ID=$AUTH0_CLIENT_ID
#ENV AUTH0_CLIENT_SECRET=$AUTH0_CLIENT_SECRET
#ENV AUTH0_AUDIENCE=$AUTH0_AUDIENCE
#ENV AUTH0_ORGANIZATION_ID=$AUTH0_ORGANIZATION_ID
#ENV AUTH0_DOMAIN=$AUTH0_DOMAIN
#ENV FLAGSMITH_ENVIRONMENT_ID=$FLAGSMITH_ENVIRONMENT_ID
#ENV WEB_AUTH0_SECRET=$WEB_AUTH0_SECRET

# Copy package.json files first
COPY --from=pruner /app/out/json/ .

# Copy scripts directory before pnpm install since postinstall script needs it
COPY scripts/ ./scripts/

# First install the dependencies with cache mount (as they change less often)
RUN --mount=type=cache,id=pnpm,target=~/.pnpm-store pnpm install

# Build the project
COPY --from=pruner /app/out/full/ .

# Uncomment and use build args to enable remote caching
# ARG TURBO_TEAM
# ENV TURBO_TEAM=$TURBO_TEAM

# ARG TURBO_TOKEN
# ENV TURBO_TOKEN=$TURBO_TOKEN

# Set build-time environment variables for standalone mode
ENV NEXT_TELEMETRY_DISABLED=1

# Run the build script with cache mount
RUN --mount=type=cache,target=/app/node_modules/.cache pnpm turbo build --filter=web


################################################################################

FROM base AS runner
WORKDIR /app

# Install runtime dependencies for Prisma ORM in production stage
RUN apk add --no-cache \
    openssl \
    ca-certificates \
    zlib \
    libgcc

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy next.config.js for reference (not strictly needed for standalone)
#COPY --from=installer --chown=nextjs:nodejs /app/apps/web/next.config.js ./

# Copy package.json for reference
#COPY --from=installer --chown=nextjs:nodejs /app/apps/web/package.json ./

# Automatically leverage output traces to reduce image size 
# https://nextjs.org/docs/advanced-features/output-file-tracing
# Log contents of .next directory to verify build output

COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/standalone ./

# Copy static folder
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

# Copy public folder if it exists 
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

# Add debug commands to verify .next directory contents
RUN set -x && \
    echo "Listing app directory contents:" && \
    ls -la /app && \
    echo "Checking static directory:" && \
    ls -la /app/apps/web/.next/static/ && \
    echo "Checking public directory:" && \
    ls -la /app/apps/web/public
# Switch to nextjs user
USER nextjs

# Expose port 3000
EXPOSE 3000

# Set hostname to 0.0.0.0 to allow connections from outside the container
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Start the Next.js server using the standalone server
CMD ["node", "apps/web/server.js"]