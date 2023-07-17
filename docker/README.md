# Flowise Docker Hub Image

Starts Flowise from [DockerHub Image](https://hub.docker.com/repository/docker/flowiseai/flowise/general)

## Usage

1. Create `.env` file and specify the `PORT` (refer to `.env.example`)
2. `docker-compose up -d`
3. Open [http://localhost:3000](http://localhost:3000)
4. You can bring the containers down by `docker-compose stop`

## 🔒 Authrorization

1. Create `.env` file and specify the `PORT`, `FLOWISE_USERNAME`, and `FLOWISE_PASSWORD` (refer to `.env.example`)
2. Pass `FLOWISE_USERNAME` and `FLOWISE_PASSWORD` to the `docker-compose.yml` file:
    ```
    environment:
        - PORT=${PORT}
        - FLOWISE_USERNAME=${FLOWISE_USERNAME}
        - FLOWISE_PASSWORD=${FLOWISE_PASSWORD}
    ```
3. `docker-compose up -d`
4. Open [http://localhost:3000](http://localhost:3000)
5. You can bring the containers down by `docker-compose stop`

## 🌱 Env Variables

If you like to persist your data (flows, logs, apikeys), set these variables in the `.env` file inside `docker` folder:

-   DATABASE_PATH=/root/.flowise
-   APIKEY_PATH=/root/.flowise
-   LOG_PATH=/root/.flowise/logs

Flowise also support different environment variables to configure your instance. Read [more](https://docs.flowiseai.com/environment-variables)

| Variable                   | Description                                                      | Type                                             | Default                             |
| -------------------------- | ---------------------------------------------------------------- | ------------------------------------------------ | ----------------------------------- |
| PORT                       | The HTTP port Flowise runs on                                    | Number                                           | 3000                                |
| FLOWISE_USERNAME           | Username to login                                                | String                                           |
| FLOWISE_PASSWORD           | Password to login                                                | String                                           |
| DEBUG                      | Print logs onto terminal/console                                 | Boolean                                          |
| LOG_PATH                   | Location where log files are stored                              | String                                           | `your-path/Flowise/packages/server` |
| LOG_LEVEL                  | Different log levels for loggers to be saved                     | Enum String: `error`, `info`, `verbose`, `debug` | `info`                              |
| DATABASE_PATH              | Location where database is saved                                 | String                                           | `your-home-dir/.flowise`            |
| APIKEY_PATH                | Location where api keys are saved                                | String                                           | `your-path/Flowise/packages/server` |
| EXECUTION_MODE             | Whether predictions run in their own process or the main process | Enum String: `child`, `main`                     | `main`                              |
| TOOL_FUNCTION_BUILTIN_DEP  | NodeJS built-in modules to be used for Tool Function             | String                                           |                                     |
| TOOL_FUNCTION_EXTERNAL_DEP | External modules to be used for Tool Function                    | String                                           |                                     |
