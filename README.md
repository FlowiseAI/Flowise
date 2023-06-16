<!-- markdownlint-disable MD030 -->

This is a fork of https://github.com/FlowiseAI/Flowise

# LangchainJS UI

Drag & drop UI to build your customized LLM flow using [LangchainJS](https://github.com/hwchase17/langchainjs)

## ⚡Quick Start
Download and Install [NodeJS](https://nodejs.org/en/download) >= 18.15.0

1. Install klonium-flow
    ```bash
    npm install -g klonium-flow
    ```
2. Start klonium-flow

    ```bash
    npx klonium-flow start
    ```

    With username & password

    ```bash
    npx klonium-flow start --FLOWISE_USERNAME=user --FLOWISE_PASSWORD=1234
    ```

3. Open [http://localhost:3000](http://localhost:3000)

## 🐳 Docker

### Docker Compose

1. Go to `docker` folder at the root of the project
2. Create `.env` file and specify the `PORT` (refer to `.env.example`)
3. `docker-compose up -d`
4. Open [http://localhost:3000](http://localhost:3000)
5. You can bring the containers down by `docker-compose stop`

### Docker Image

1. Build the image locally:
    ```bash
    docker build --no-cache -t klonium-flow .
    ```
2. Run image:

    ```bash
    docker run -d --name klonium-flow -p 3000:3000 klonium-flow
    ```

3. Stop image:
    ```bash
    docker stop klonium-flow
    ```

##  Developers

3 different modules in a single mono repository.

-   `server`: Node backend to serve API logics
-   `ui`: React frontend
-   `components`: Langchain components

### Prerequisite

-   Install Yarn
    ```bash
    npm i -g yarn
    ```

### Setup

1. Clone the repository

    ```bash
    git clone https://github.com/cloniumagent/klonium-flow.git
    ```

2. Go into repository folder

    ```bash
    cd klonium-flow
    ```

3. Install all dependencies of all modules:

    ```bash
    yarn install
    ```

4. Build all the code:

    ```bash
    yarn build
    ```

5. Start the app:

    ```bash
    yarn start
    ```

    You can now access the app on [http://localhost:3000](http://localhost:3000)

6. For development build:

    ```bash
    yarn dev
    ```

    Any code changes will reload the app automatically on [http://localhost:8080](http://localhost:8080)

## 🔒 Authentication

To enable app level authentication, add `FLOWISE_USERNAME` and `FLOWISE_PASSWORD` to the `.env` file in `packages/server`:

```
FLOWISE_USERNAME=user
FLOWISE_PASSWORD=1234
```

## 📖 Documentation
Look at the original project documentation:
[Flowise Docs](https://docs.flowiseai.com/)

## 📄 License

Source code in this repository is made available under the [MIT License](LICENSE.md).
