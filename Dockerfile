# syntax=docker/dockerfile:1

# Comments are provided throughout this file to help you get started.
# If you need more help, visit the Dockerfile reference guide at
# https://docs.docker.com/go/dockerfile-reference/

# Want to help us make this template better? Share your feedback here: https://forms.gle/ybq9Krt8jtBL3iCk7

ARG NODE_VERSION=20

################################################################################
# Use node image for base image for all stages.
FROM node:${NODE_VERSION}-alpine as base

# Set working directory for all build stages.
WORKDIR /app

RUN apk add g++ make py3-pip
RUN apk add --update libc6-compat python3 make g++
# needed for pdfjs-dist
RUN apk add --no-cache build-base cairo-dev pango-dev
# Install Chromium
RUN apk add --no-cache chromium

#install PNPM globaly
RUN npm install -g pnpm turbo
RUN pnpm config set store-dir ~/.pnpm-store

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

################################################################################

# Prune projects 
FROM base AS pruner

COPY . .

RUN turbo prune --scope=flowise --docker

################################################################################

# Create a stage for building the application.
FROM base as build

COPY --from=pruner /app/out/json/ .

# First install the dependencies (as they change less often)
RUN --mount=type=cache,id=pnpm,target=~/.pnpm-store pnpm install 

# Copy the rest of the source files into the image.
COPY --from=pruner /app/out/full/ .

# Run the build script.
RUN --mount=type=cache,target=/app/node_modules/.cache pnpm run build --filter flowise

# Prune the dev dependencies
RUN --mount=type=cache,id=pnpm,target=~/.pnpm-store pnpm prune --prod --no-optional

################################################################################

FROM base AS runner

ENV NODE_ENV production

COPY --from=build /app .

WORKDIR /app/packages/server

# Expose the port that the application listens on.
EXPOSE 4000

COPY env.sh /docker-entrypoint.d/env.sh
RUN chmod +x /docker-entrypoint.d/env.sh

# Run the application.
ENTRYPOINT ["/docker-entrypoint.d/env.sh"]
CMD ["npm", "start"]
