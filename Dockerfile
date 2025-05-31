# Wersja Node.js (dostosuj w razie potrzeby)
FROM node:18

# Ustaw katalog roboczy
WORKDIR /usr/src/app

# Skopiuj pliki package.json i package-lock.json
COPY package*.json ./

# Instalacja zależności
RUN npm install

# Skopiuj resztę aplikacji
COPY . .

# Upewnij się, że Flowise będzie widoczny na odpowiednim porcie (domyślnie 3000)
EXPOSE 3000

# Ustaw zmienną środowiskową DATABASE_URL (Render ustawia ją automatycznie, ale warto ją jawnie przekazać)
ENV DATABASE_URL=${DATABASE_URL}

# Uruchom aplikację
CMD ["npm", "run", "start"]
