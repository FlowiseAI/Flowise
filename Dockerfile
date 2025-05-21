# Build local monorepo image
# docker build --no-cache -t  flowise .

# Run image
# docker run -d -p 3000:3000 flowise

FROM node:20-alpine
RUN apk add --update libc6-compat python3 py3-pip make g++ openssl-dev gfortran libffi-dev openblas-dev cargo wget
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

WORKDIR /usr/src

# Copy app source
COPY . .

RUN pnpm install

RUN pnpm build

# Install vectorbt.pro and its Python dependencies
RUN echo "Downloading vectorbt.pro..." && \
    wget -O /tmp/vectorbt.pro.whl 'https://drive.google.com/uc?export=download&id=1ktNSdLunLOk_C4tUOBROtmE2Mw7spyJ9' && \
    echo "Installing vectorbt.pro..." && \
    pip3 install /tmp/vectorbt.pro.whl --no-cache-dir && \
    echo "Cleaning up vectorbt.pro download..." && \
    rm /tmp/vectorbt.pro.whl

EXPOSE 3000

CMD [ "pnpm", "start" ]
