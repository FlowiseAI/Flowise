FROM node:18-alpine
USER root

# Arguments that can be passed at build time
ARG FLOWISE_PATH=/usr/local/lib/node_modules/flowise
ARG PORT=7860
ARG PASSPHRASE=
ARG DATABASE_PATH=/root/.flowise
ARG APIKEY_PATH=/root/.flowise
ARG SECRETKEY_PATH=/root/.flowise
ARG LOG_PATH=/root/.flowise/logs

# Install dependencies
RUN apk add --no-cache git python3 py3-pip make g++ build-base cairo-dev pango-dev chromium

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Set environment variables using the arguments
ENV PORT=$PORT
ENV PASSPHRASE=$PASSPHRASE
ENV DATABASE_PATH=$DATABASE_PATH
ENV APIKEY_PATH=$APIKEY_PATH
ENV SECRETKEY_PATH=$SECRETKEY_PATH
ENV LOG_PATH=$LOG_PATH

# Install Flowise globally
RUN npm install -g flowise

# Configure Flowise directories using the ARG
RUN mkdir -p $FLOWISE_PATH 			    && chmod -R 777 $FLOWISE_PATH
RUN mkdir -p $LOG_PATH 	            && chmod -R 777 $LOG_PATH
RUN mkdir -p $FLOWISE_PATH/uploads  && chmod -R 777 $FLOWISE_PATH/uploads

WORKDIR /data

CMD ["npx", "flowise", "start"]
