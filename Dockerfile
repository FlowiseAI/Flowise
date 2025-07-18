# syntax=docker/dockerfile:1

# Comments are provided throughout this file to help you get started.
# If you need more help, visit the Dockerfile reference guide at
# https://docs.docker.com/go/dockerfile-reference/

FROM --platform=linux/amd64 node:20-alpine as base

WORKDIR /app

RUN apk add --update libc6-compat python3 make g++ bash
# needed for pdfjs-dist
RUN apk add --no-cache build-base cairo-dev pango-dev
# Install Chromium
RUN apk add --no-cache chromium

# Install curl for container-level health checks
# Fixes: https://github.com/FlowiseAI/Flowise/issues/4126
RUN apk add --no-cache curl

#install PNPM globaly
RUN npm install -g pnpm turbo@1
RUN pnpm config set store-dir ~/.pnpm-store

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV NODE_OPTIONS=--max-old-space-size=8192
################################################################################

# Prune projects 
FROM base AS pruner

COPY . .

RUN turbo prune --scope=flowise --docker

################################################################################

# Create a stage for building the application.
FROM base as build

# Copy package.json files and patches directory first
COPY --from=pruner /app/out/json/ .

# Copy scripts directory before pnpm install since postinstall script needs it
COPY scripts/ ./scripts/

# First install the dependencies (as they change less often)
RUN --mount=type=cache,id=pnpm,target=~/.pnpm-store pnpm install 

# Copy the rest of the source files into the image.
COPY --from=pruner /app/out/full/ .

# Run the build script.
RUN --mount=type=cache,target=/app/node_modules/.cache pnpm run build --filter flowise

# Prune the dev dependencies
#RUN --mount=type=cache,id=pnpm,target=~/.pnpm-store pnpm prune --prod --no-optional

################################################################################

FROM base AS runner

ENV NODE_ENV production

COPY --from=build /app .

WORKDIR /app/packages/server

# Expose the port that the application listens on.
EXPOSE 4000

CMD ["pnpm", "start"]
