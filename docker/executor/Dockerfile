FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --production=false

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

RUN npm prune --production

EXPOSE 3100

USER node

CMD ["node", "dist/index.js"]
