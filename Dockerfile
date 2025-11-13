# Build local monorepo image
# docker build --no-cache -t  flowise .

# Run image
# docker run -d -p 3000:3000 flowise

FROM node:20-alpine
RUN apk add --update libc6-compat python3 make g++
# needed for pdfjs-dist
RUN apk add --no-cache build-base cairo-dev pango-dev

# Install Chromium
RUN apk add --no-cache chromium

# Install curl for container-level health checks
# Fixes: https://github.com/FlowiseAI/Flowise/issues/4126
RUN apk add --no-cache curl

#install PNPM globaly
RUN npm install -g pnpm

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

ENV NODE_OPTIONS=--max-old-space-size=8192

WORKDIR /usr/src/flowise

# Copy app source
COPY . .

RUN pnpm install

RUN pnpm build

# Create a non-root user and group
RUN addgroup -g 1001 flowise && \
    adduser -D -u 1001 -G flowise flowise

# Change ownership of the application files to the non-root user (full access)
RUN chown -R flowise:flowise /usr/src/flowise

# Give flowise group read+execute access to chromium-browser
RUN chgrp flowise /usr/bin/chromium-browser && \
    chmod 750 /usr/bin/chromium-browser

# Switch to non-root user
USER flowise

EXPOSE 3000

CMD [ "pnpm", "start" ]
