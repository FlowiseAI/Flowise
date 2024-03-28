# syntax=docker/dockerfile:1

# Comments are provided throughout this file to help you get started.
# If you need more help, visit the Dockerfile reference guide at
# https://docs.docker.com/go/dockerfile-reference/

# Want to help us make this template better? Share your feedback here: https://forms.gle/ybq9Krt8jtBL3iCk7

ARG NODE_VERSION=21

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
RUN npm install -g pnpm

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
################################################################################
# Create a stage for installing production dependecies.
FROM base as deps

# Download dependencies as a separate step to take advantage of Docker's caching.
# Leverage a cache mount to /root/.pnpm to speed up subsequent builds.
# Leverage bind mounts to package.json and pnpm.lock to avoid having to copy them
# into this layer.
RUN --mount=type=bind,source=package.json,target=package.json \
  --mount=type=bind,source=packages/ui/package.json,target=packages/ui/package.json \
  --mount=type=bind,source=packages/embed/package.json,target=packages/embed/package.json \
  --mount=type=bind,source=packages/embed-react/package.json,target=packages/embed-react/package.json \
  --mount=type=bind,source=packages/server/package.json,target=packages/server/package.json \
  --mount=type=bind,source=packages/components/package.json,target=packages/components/package.json \
  --mount=type=bind,source=pnpm.lock,target=pnpm.lock \
  --mount=type=cache,target=/root/.pnpm \
  pnpm install --production --frozen-lockfile --ignore-engines

################################################################################
# Create a stage for building the application.
FROM deps as build

# Download additional development dependencies before building, as some projects require
# "devDependencies" to be installed to build. If you don't need this, remove this step.
RUN --mount=type=bind,source=package.json,target=package.json \
  --mount=type=bind,source=packages/ui/package.json,target=packages/ui/package.json \
  --mount=type=bind,source=packages/embed/package.json,target=packages/embed/package.json \
  --mount=type=bind,source=packages/embed-react/package.json,target=packages/embed-react/package.json \
  --mount=type=bind,source=packages/server/package.json,target=packages/server/package.json \
  --mount=type=bind,source=packages/components/package.json,target=packages/components/package.json \
  --mount=type=bind,source=pnpm.lock,target=pnpm.lock \
  --mount=type=cache,target=/root/.pnpm \
  pnpm install --frozen-lockfile --ignore-engines

# Copy the rest of the source files into the image.
COPY . .
# Run the build script.
RUN --mount=type=cache,target=/app/node_modules/.cache pnpm run build

################################################################################
# Create a new stage to run the application with minimal runtime dependencies
# where the necessary files are copied from the build stage.
FROM base as final


# Use production node environment by default.
ENV NODE_ENV production

# Copy package.json so that package manager commands can be used.
COPY package.json .
COPY packages/components/package.json ./packages/components/package.json
# Copy ui package.json
COPY packages/ui/package.json ./packages/ui/package.json
COPY packages/embed/package.json ./packages/embed/package.json
COPY packages/embed-react/package.json ./packages/embed-react/package.json
# Copy server package.json
COPY packages/server/package.json ./packages/server/package.json

# Copy the production dependencies from the deps stage and also
# the built application from the build stage into the image.
COPY --from=deps /app/packages/components/node_modules ./packages/components/node_modules
COPY --from=deps /app/packages/server/node_modules ./packages/server/node_modules
COPY --from=deps /app/packages/ui/node_modules ./packages/ui/node_modules
COPY --from=deps /app/packages/embed/node_modules ./packages/embed/node_modules
COPY --from=deps /app/packages/embed-react/node_modules ./packages/embed-react/node_modules
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/components/dist ./packages/components/dist
COPY --from=build /app/packages/components/nodes ./packages/components/nodes
COPY --from=build /app/packages/ui/build ./packages/ui/build
COPY --from=build /app/packages/embed/dist ./packages/embed/dist
COPY --from=build /app/packages/embed-react/dist ./packages/embed-react/dist
COPY --from=build /app/packages/server/dist ./packages/server/dist
COPY --from=build /app/packages/server/bin ./packages/server/bin
COPY --from=build /app/packages/server/marketplaces ./packages/server/marketplaces

# Expose the port that the application listens on.
EXPOSE 4000

COPY env.sh /docker-entrypoint.d/env.sh
RUN chmod +x /docker-entrypoint.d/env.sh

# Run the application.
ENTRYPOINT ["/docker-entrypoint.d/env.sh"]
CMD ["pnpm", "start"]
