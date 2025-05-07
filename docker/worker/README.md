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

1. Copy paste the same `.env` file used to setup main server. Change the `PORT` to other available port numbers. Ex: 5566
2. `docker compose up -d`
3. Open [http://localhost:5566](http://localhost:5566)
4. You can bring the worker container down by `docker compose stop`
