# Flowise Docker Hub Image

Starts Flowise from [DockerHub Image](https://hub.docker.com/r/flowiseai/flowise)

## Usage

1. Create `.env` file and specify the `PORT` (refer to `.env.example`)
2. `docker compose up -d`
3. Open [http://localhost:3000](http://localhost:3000)
4. You can bring the containers down by `docker compose stop`

## 🌱 Env Variables

If you like to persist your data (flows, logs, credentials, storage), set these variables in the `.env` file inside `docker` folder:

-   DATABASE_PATH=/root/.flowise
-   LOG_PATH=/root/.flowise/logs
-   SECRETKEY_PATH=/root/.flowise
-   BLOB_STORAGE_PATH=/root/.flowise/storage

Flowise also support different environment variables to configure your instance. Read [more](https://docs.flowiseai.com/configuration/environment-variables)

## Queue Mode:

### Building from source:

You can build the images for worker and main from scratch with:

```
docker compose -f docker-compose-queue-source.yml up -d
```

Monitor Health:

```
docker compose -f docker-compose-queue-source.yml ps
```

### From pre-built images:

You can also use the pre-built images:

```
docker compose -f docker-compose-queue-prebuilt.yml up -d
```

Monitor Health:

```
docker compose -f docker-compose-queue-prebuilt.yml ps
```
