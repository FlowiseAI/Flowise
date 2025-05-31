FROM node:18

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

ENV DATABASE_URL=${DATABASE_URL}

CMD ["npm", "run", "start"]
