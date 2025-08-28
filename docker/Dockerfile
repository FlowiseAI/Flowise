# Stage 1: Build stage
FROM node:20-alpine AS build

USER root

# Skip downloading Chrome for Puppeteer (saves build time)
ENV PUPPETEER_SKIP_DOWNLOAD=true

# Install build tools and pnpm
RUN apk add --no-cache python3 py3-pip make g++ git
RUN npm i -g pnpm turbo

# Copy monorepo
WORKDIR /app
COPY . .

# Set Vite base path for UI build at build time via ARG -> ENV
ARG VITE_BASE_PATH
ARG VITE_API_BASE_URL
ENV VITE_BASE_PATH=${VITE_BASE_PATH}
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Install deps and build all packages
RUN pnpm install --frozen-lockfile && pnpm build

# Stage 2: Runtime stage
FROM node:20-alpine

# Install runtime dependencies
RUN apk add --no-cache chromium curl cairo-dev pango-dev

# Set the environment variable for Puppeteer to find Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Create app directory
WORKDIR /app

# Copy node_modules from builder for runtime first to preserve workspace structure
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/packages/server/node_modules /app/packages/server/node_modules

# Copy built server dist and bin
COPY --from=build /app/packages/server/dist /app/packages/server/dist
COPY --from=build /app/packages/server/bin /app/packages/server/bin
COPY --from=build /app/packages/server/package.json /app/packages/server/package.json

# Copy workspaces that are symlinked from node_modules
COPY --from=build /app/packages/ui /app/packages/ui
COPY --from=build /app/packages/components /app/packages/components

# Default PORT
ENV PORT=3000

# Optional base path for server to mount under (e.g., "/flowise")
ENV BASE_PATH=

# Expose port
EXPOSE 3000

# Start server
# WORKDIR /app/packages/server
# ENTRYPOINT ["node", "dist/index.js"]
WORKDIR /app/packages/server/bin
ENTRYPOINT ["./run", "start"]
