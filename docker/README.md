# Flowise Docker Hub Image

Starts Flowise from [DockerHub Image](https://hub.docker.com/repository/docker/flowiseai/flowise/general)

## Usage

1. Create `.env` file and specify the `PORT` (refer to `.env.example`)
2. `docker-compose up -d`
3. Open [http://localhost:3000](http://localhost:3000)
4. You can bring the containers down by `docker-compose stop`

## With Authrorization

1. Create `.env` file and specify the `PORT`, `USERNAME`, and `PASSWORD` (refer to `.env.example`)
2. Pass `USERNAME` and `PASSWORD` to the `docker-compose.yml` file:
    ```
    environment:
        - PORT=${PORT}
        - USERNAME=${USERNAME}
        - PASSWORD=${PASSWORD}
    ```
3. `docker-compose up -d`
4. Open [http://localhost:3000](http://localhost:3000)
5. You can bring the containers down by `docker-compose stop`
