---
description: Learn how to run AnswerAI locally
---

# Getting Started with AnswerAI Locally

:::info
Before you begin, ensure you have [NodeJS](https://nodejs.org/en/download) installed on your computer. AnswerAI supports Node `v18.15.0` or `v20` and above.
:::

## Quick Start

Install and run AnswerAI locally using NPM:

1. Install AnswerAI:

    ```bash
    npm install -g answerai
    ```

2. Start AnswerAI:

    ```bash
    npx answerai start
    ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Docker Deployment

You can deploy AnswerAI using Docker in two ways:

### Docker Compose

1. Navigate to the `docker` folder at the root of the project.
2. Copy the `.env.example` file and rename it to `.env`.
3. Run:

    ```bash
    docker compose up -d
    ```

4. Access AnswerAI at [http://localhost:3000](http://localhost:3000).
5. To stop the containers:

    ```bash
    docker compose stop
    ```

### Docker Image

1. Build the image:

    ```bash
    docker build --no-cache -t answerai .
    ```

2. Run the image:

    ```bash
    docker run -d --name answerai -p 3000:3000 answerai
    ```

3. Stop the container:

    ```bash
    docker stop answerai
    ```

## For Developers

AnswerAI is structured as a monorepo with three main modules:

-   **Server**: Node.js backend for API logic
-   **UI**: React frontend
-   **Components**: Integration components

### Prerequisites

Install [PNPM](https://pnpm.io/installation):

```bash
npm i -g pnpm
```

### Setup for Contributors

1. Fork the official [AnswerAI Github Repository](https://github.com/AnswerAI/AnswerAI).
2. Clone your forked repository.
3. Create a new branch:
    - For features: `feature/<Your-New-Feature>`
    - For bug fixes: `bugfix/<Your-New-Bugfix>`
4. Switch to your new branch.
5. Navigate to the repository folder:

    ```bash
    cd AnswerAI
    ```

6. Install dependencies:

    ```bash
    pnpm install
    ```

7. Build the code:

    ```bash
    pnpm build
    ```

8. Start AnswerAI:

    ```bash
    pnpm start
    ```

    Access it at [http://localhost:3000](http://localhost:3000).

### Development Build

For development:

1. Create `.env` files in both `packages/ui` and `packages/server`, specifying the `PORT` (refer to `.env.example` in each directory).
2. Run:

    ```bash
    pnpm dev
    ```

    - Changes in `packages/ui` or `packages/server` will be reflected at [http://localhost:8080](http://localhost:8080/).
    - For changes in `packages/components`, rebuild the project.

3. After making changes, always run:

    ```bash
    pnpm build
    ```

    and

    ```bash
    pnpm start
    ```

    to ensure everything works in production.

<!-- TODO: Add video tutorial for AnswerAI setup when available -->
