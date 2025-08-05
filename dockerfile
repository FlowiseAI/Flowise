FROM node:20

# Create app directory
WORKDIR /usr/src/app

# Copy files
COPY . .

# Install dependencies
RUN npm install -w packages/flowise --legacy-peer-deps

# Build the app
RUN npm run build -w packages/flowise

# Expose port
EXPOSE 3000

# Start the app
CMD ["npm", "run", "start", "-w", "packages/flowise"]
