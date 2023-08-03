FROM node:18-alpine

USER root

RUN apk add --no-cache git
RUN apk add --no-cache python3 py3-pip make g++
# needed for pdfjs-dist
RUN apk add --no-cache build-base cairo-dev pango-dev

# Install Chromium
RUN apk add --no-cache chromium

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# You can install a specific version like: flowise@1.0.0
RUN npm install -g flowise

RUN mkdir -p /usr/local/lib/node_modules/flowise/uploads 	 && chmod -R 777 /usr/local/lib/node_modules/flowise/uploads
RUN mkdir -p /usr/local/lib/node_modules/flowise/logs    	 && chmod -R 777 /usr/local/lib/node_modules/flowise/logs
RUN touch /usr/local/lib/node_modules/flowise/api.json       && chmod 777 /usr/local/lib/node_modules/flowise/api.json
RUN touch /usr/local/lib/node_modules/flowise/encryption.key && chmod 777 /usr/local/lib/node_modules/flowise/encryption.key

WORKDIR /data

CMD ["npx", "flowise", "start"]
