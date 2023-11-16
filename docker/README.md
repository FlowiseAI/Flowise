# SAIA Docker Hub Image

Starts SAIA from [DockerHub Image](https://hub.docker.com/repository/docker/SAIAai/SAIA/general)

## Usage

1. Create `.env` file and specify the `PORT` (refer to `.env.example`)
2. `docker-compose up -d`
3. Open [http://localhost:3000](http://localhost:3000)
4. You can bring the containers down by `docker-compose stop`

## 🔒 Authentication

1. Create `.env` file and specify the `PORT`, `SAIA_USERNAME`, and `SAIA_PASSWORD` (refer to `.env.example`)
2. Pass `SAIA_USERNAME` and `SAIA_PASSWORD` to the `docker-compose.yml` file:
    ```
    environment:
        - PORT=${PORT}
        - SAIA_USERNAME=${SAIA_USERNAME}
        - SAIA_PASSWORD=${SAIA_PASSWORD}
    ```
3. `docker-compose up -d`
4. Open [http://localhost:3000](http://localhost:3000)
5. You can bring the containers down by `docker-compose stop`

## 🌱 Env Variables

If you like to persist your data (flows, logs, apikeys, credentials), set these variables in the `.env` file inside `docker` folder:

-   DATABASE_PATH=/root/.SAIA
-   APIKEY_PATH=/root/.SAIA
-   LOG_PATH=/root/.SAIA/logs
-   SECRETKEY_PATH=/root/.SAIA

SAIA also support different environment variables to configure your instance. Read [more](https://docs.SAIAai.com/environment-variables)
