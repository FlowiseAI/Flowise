# Build local monorepo image
# docker build --no-cache -t  flowise .

# Run image
# docker run -d -p 3000:3000 flowise

FROM node:20-bullseye-slim

# Instalar Python, pip, libomp, Chromium y demás paquetes que antes usabas con apk
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    libomp-dev \
    make \
    g++ \
    libcairo2-dev \
    libpango-1.0-0 \
    chromium

#install PNPM globaly
RUN npm install -g pnpm

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

ENV NODE_OPTIONS=--max-old-space-size=8192

WORKDIR /usr/src

# Copy app source
COPY . .

RUN pnpm install

RUN pnpm build

EXPOSE 3000

CMD [ "pnpm", "start" ]
