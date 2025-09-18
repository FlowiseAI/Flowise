# Flowise Worker

By utilizing worker instances when operating in queue mode, Flowise can be scaled horizontally by adding more workers to handle increased workloads or scaled down by removing workers when demand decreases.

Here’s an overview of the process:

1. The primary Flowise instance sends an execution ID to a message broker, Redis, which maintains a queue of pending executions, allowing the next available worker to process them.
2. A worker from the pool retrieves a message from Redis.
   The worker starts execute the actual job.
3. Once the execution is completed, the worker alerts the main instance that the execution is finished.

# How to use

## Setting up Main Server:

1. Follow [setup guide](https://github.com/FlowiseAI/Flowise/blob/main/docker/README.md)
2. In the `.env.example`, setup all the necessary env variables for `QUEUE CONFIGURATION`

## Setting up Worker:

1. Navigate to `docker/worker` folder
2. In the `.env.example`, setup all the necessary env variables for `QUEUE CONFIGURATION`. Env variables for worker must match the one for main server. Change the `WORKER_PORT` to other available port numbers to listen for healthcheck. Ex: 5566
3. `docker compose up -d`
4. You can bring the worker container down by `docker compose stop`

## Entrypoint:

Different from main server image which is using `flowise start`, entrypoint for worker is `pnpm run start-worker`. This is because the worker's [Dockerfile](./Dockerfile) build the image from source files via `pnpm build` instead of npm registry via `RUN npm install -g flowise`.
