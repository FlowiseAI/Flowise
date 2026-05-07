# Build local monorepo image
# docker build --no-cache -t  flowise .

# Run image
# docker run -d -p 3000:3000 flowise

FROM node:20-alpine

# Install system dependencies and build tools
RUN apk update && \
    apk add --no-cache \
        libc6-compat \
        python3 \
        make \
        g++ \
        build-base \
        cairo-dev \
        pango-dev \
        chromium \
        curl && \
    npm install -g pnpm

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

ENV NODE_OPTIONS=--max-old-space-size=8192

# Create app directory and give node user ownership BEFORE switching user
RUN mkdir -p /usr/src/flowise && chown -R node:node /usr/src/flowise

# Switch to non-root user (node user already exists in node:20-alpine)
USER node

WORKDIR /usr/src/flowise

# Copy app source with correct ownership from the start
COPY --chown=node:node . .

# Install dependencies and build
RUN pnpm install && \
    pnpm build

EXPOSE 3000

CMD [ "pnpm", "start" ]