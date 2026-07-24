# Node.js version (overridable via build-arg from CI)
ARG NODE_VERSION=24
ARG FLOWISE_VERSION=latest

# Stage 1: Build stage
FROM node:${NODE_VERSION}-alpine AS build

ARG FLOWISE_VERSION

USER root

# Install build dependencies
RUN apk add --no-cache git python3 py3-pip make g++ build-base cairo-dev pango-dev

# Skip downloading Chrome for Puppeteer (saves build time)
ENV PUPPETEER_SKIP_DOWNLOAD=true

# Install the package version that the image will be tagged with.
RUN npm install -g "flowise@${FLOWISE_VERSION}"

# Stage 2: Runtime stage
FROM node:${NODE_VERSION}-alpine

# Install runtime dependencies
RUN apk add --no-cache chromium git python3 py3-pip make g++ build-base cairo-dev pango-dev curl

# Set the environment variable for Puppeteer to find Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Copy Flowise from the build stage
COPY --from=build /usr/local/lib/node_modules /usr/local/lib/node_modules
COPY --from=build /usr/local/bin /usr/local/bin

ENTRYPOINT ["flowise", "start"]
