# Docker User Guide

## 📦 Prerequisites
- NPM or CLI console that supports bash

## 🌱 Env Variables
The Autosetup will copy the ENV file automatically, but if you want to customize the configuration, you can copy the `.env.example` file to `.env` and change the values. Otherwise, just skip this step.

Flowise also support different environment variables to configure your instance. Read [more](https://docs.flowiseai.com/environment-variables)

## 🚀 Quick Start  

#### Method A: 
From the root dir, run the following command:  
`npm run docker:start`  

#### Method B: 
From the root dir, run the following command: 
`sh ./docker/start`  

Open [http://localhost:3000](http://localhost:3000)  

**Note**: Yarn install, yarn build and start, are automatically executed when you run the start script. If they are not or you need to add other packages or execute them manually, enter the container and run them from there. Do not run these commands outside of the container because they will not work or bring issues with docker performance. 
Use: `npm run docker:cli` it will get you inside the docker container bash.

## 🔒 Authentication

1. Pass `FLOWISE_USERNAME` and `FLOWISE_PASSWORD` to the `docker-compose.yml` file:
    ```
    environment:
        - PORT=${PORT}
        - FLOWISE_USERNAME=${FLOWISE_USERNAME}
        - FLOWISE_PASSWORD=${FLOWISE_PASSWORD}
    ```
2. Run `npm run docker:start`
3. Open [http://localhost:3000](http://localhost:3000)
5. You can bring the containers down by `npm run docker:stop`

