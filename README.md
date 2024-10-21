<!-- markdownlint-disable MD030 -->

<img width="100%" src="https://github.com/the-answerai/theanswer/blob/main/images/flowise.png?raw=true"></a>

# TheAnswer - Build LLM Apps Easily with Flowise

[![Discord](https://img.shields.io/discord/1087698854775881778?label=Discord&logo=discord)](https://discord.gg/jbaHfsRVBW)
[![Twitter Follow](https://img.shields.io/twitter/follow/TheAnswerAI?style=social)](https://twitter.com/TheAnswerAI)
[![GitHub star chart](https://img.shields.io/github/stars/the-answerai/theanswer?style=social)](https://star-history.com/#the-answerai/theanswer)
[![GitHub fork](https://img.shields.io/github/forks/the-answerai/theanswer?style=social)](https://github.com/the-answerai/theanswer/fork)

English | [中文](./i18n/README-ZH.md) | [日本語](./i18n/README-JA.md) | [한국어](./i18n/README-KR.md)

<h3>Drag & drop UI to build your customized LLM flow with TheAnswer</h3>
<a href="https://github.com/the-answerai/theanswer">
<img width="100%" src="https://github.com/the-answerai/theanswer/blob/main/images/flowise.gif?raw=true"></a>

## 🌟 What is TheAnswer?

TheAnswer is a revolutionary AI-powered productivity suite that empowers individuals and organizations to streamline their workflows, enhance decision-making, and boost creativity. Built on top of the popular open-source project Flowise, TheAnswer extends its capabilities to provide a comprehensive set of tools designed to tackle a wide range of tasks with unprecedented efficiency and intelligence.

### Key Features

1. **AI Sidekicks (Chatflows)**: Task-specific AI assistants for various purposes.
2. **Document Stores**: Connect and access data from multiple third-party services.
3. **Powerful Tools Integration**: Leverage various tools to extend AI capabilities.
4. **Developer-Friendly Platform**: Customizable AI models and workflows with API access.
5. **Shareable Chatbots**: Easily deploy and share custom AI Sidekicks.
6. **Integration with Flowise**: Seamless integration with the open-source workflow builder.

## ⚡Quick Start

Since TheAnswer is built on top of Flowise, you can start by using Flowise and then integrate TheAnswer features.

Download and Install [NodeJS](https://nodejs.org/en/download) >= 18.15.0

1. Install Flowise
    ```bash
    npm install -g flowise
    ```
2. Start Flowise

    ```bash
    npx flowise start
    ```

    With username & password

    ```bash
    npx flowise start --FLOWISE_USERNAME=user --FLOWISE_PASSWORD=1234
    ```

3. Open [http://localhost:3000](http://localhost:3000)

Note: The TheAnswer package is currently under development and not yet published to npm. Stay tuned for updates on when it will be available as a standalone CLI tool.

## 🐳 Docker

### Docker Compose

1. Go to `docker` folder at the root of the project
2. Copy `.env.example` file, paste it into the same location, and rename to `.env`
3. `docker compose up -d`
4. Open [http://localhost:3000](http://localhost:3000)
5. You can bring the containers down by `docker compose stop`

### Docker Image

1. Build the image locally:
    ```bash
    docker build --no-cache -t flowise .
    ```
2. Run image:

    ```bash
    docker run -d --name flowise -p 3000:3000 flowise
    ```

3. Stop image:
    ```bash
    docker stop flowise
    ```

## 👨‍💻 Developers

TheAnswer is built on top of Flowise and extends its functionality. The project structure is as follows:

### Packages (from Flowise)

All packages inside `packages/*` are from the original Flowise project:

-   `server`: Node backend to serve API logics
-   `ui`: React frontend
-   `components`: Third-party nodes integrations
-   `embed`: Embedding functionality
-   `embed-react`: React components for embedding
-   `flowise-configs`: Configuration files for Flowise

### Packages-Answers (TheAnswer-specific)

TheAnswer adds additional functionality through the `packages-answers/*` directory:

-   `db`: Database interactions
-   `eslint-config-custom`: Custom ESLint configuration
-   `experimental-prisma-webpack-plugin`: Experimental Prisma plugin for Webpack
-   `tsconfig`: TypeScript configuration
-   `types`: Shared type definitions
-   `ui`: TheAnswer-specific UI components
-   `utils`: Utility functions

This structure allows TheAnswer to build upon Flowise's core functionality while adding its own features and customizations.

### Prerequisite

-   Install [PNPM](https://pnpm.io/installation)
    ```bash
    npm i -g pnpm
    ```

### Setup

1.  Clone the repository

    ```bash
    git clone https://github.com/the-answerai/theanswer.git
    ```

2.  Go into repository folder

    ```bash
    cd theanswer
    ```

3.  Install all dependencies of all modules:

    ```bash
    pnpm install
    ```

4.  Build all the code:

    ```bash
    pnpm build
    ```

    <details>
    <summary>Exit code 134 (JavaScript heap out of memory)</summary>  
      If you get this error when running the above `build` script, try increasing the Node.js heap size and run the script again:

        export NODE_OPTIONS="--max-old-space-size=4096"
        pnpm build

    </details>

5.  Start the app:

    ```bash
    pnpm start
    ```

    You can now access the app on [http://localhost:3000](http://localhost:3000)

6.  For development build:

    -   Create `.env` file and specify the `VITE_PORT` (refer to `.env.example`) in `packages/ui`
    -   Create `.env` file and specify the `PORT` (refer to `.env.example`) in `packages/server`
    -   Run

        ```bash
        pnpm dev
        ```

    Any code changes will reload the app automatically on [http://localhost:8080](http://localhost:8080)

## 🔒 Authentication

To enable app level authentication, add `FLOWISE_USERNAME` and `FLOWISE_PASSWORD` to the `.env` file in `packages/server`:

```
FLOWISE_USERNAME=user
FLOWISE_PASSWORD=1234
```

## 🌱 Env Variables

TheAnswer supports different environment variables to configure your instance. You can specify the following variables in the `.env` file inside `packages/server` folder. Read [more](https://github.com/the-answerai/theanswer/blob/main/CONTRIBUTING.md#-env-variables)

## 📖 Documentation

[TheAnswer Docs](https://docs.theanswer.ai/)

## 🌐 Self Host

Deploy TheAnswer self-hosted in your existing infrastructure. We support various [deployments](https://docs.theanswer.ai/configuration/deployment)

-   [Copilot](./DEPLOYMENT_COPILOT.md)
-   [AWS](https://docs.theanswer.ai/deployment/aws)
-   [Azure](https://docs.theanswer.ai/deployment/azure)
-   [Digital Ocean](https://docs.theanswer.ai/deployment/digital-ocean)
-   [GCP](https://docs.theanswer.ai/deployment/gcp)
-   <details>
      <summary>Others</summary>

    -   [Railway](https://docs.theanswer.ai/deployment/railway)

        [![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/pn4G8S?referralCode=WVNPD9)

    -   [Render](https://docs.theanswer.ai/deployment/render)

        [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://docs.theanswer.ai/deployment/render)

    -   [HuggingFace Spaces](https://docs.theanswer.ai/deployment/hugging-face)

        <a href="https://huggingface.co/spaces/TheAnswer/TheAnswer"><img src="https://huggingface.co/datasets/huggingface/badges/raw/main/open-in-hf-spaces-sm.svg" alt="HuggingFace Spaces"></a>

    -   [Elestio](https://elest.io/open-source/theanswer)

        [![Deploy](https://pub-da36157c854648669813f3f76c526c2b.r2.dev/deploy-on-elestio-black.png)](https://elest.io/open-source/theanswer)

    -   [Sealos](https://cloud.sealos.io/?openapp=system-template%3FtemplateName%3Dtheanswer)

        [![](https://raw.githubusercontent.com/labring-actions/templates/main/Deploy-on-Sealos.svg)](https://cloud.sealos.io/?openapp=system-template%3FtemplateName%3Dtheanswer)

    -   [RepoCloud](https://repocloud.io/details/?app_id=29)

        [![Deploy on RepoCloud](https://d16t0pc4846x52.cloudfront.net/deploy.png)](https://repocloud.io/details/?app_id=29)

      </details>

## 💻 Cloud Hosted

Visit [https://theanswer.ai/](https://theanswer.ai/) to learn more about our cloud-hosted solution.

## 🙋 Support

Feel free to ask any questions, raise problems, and request new features in [discussion](https://github.com/the-answerai/theanswer/discussions)

## 🙌 Contributing

Thanks go to these awesome contributors of both TheAnswer and the original Flowise project

<a href="https://github.com/the-answerai/theanswer/graphs/contributors">
<img src="https://contrib.rocks/image?repo=the-answerai/theanswer" />
</a>

See [contributing guide](CONTRIBUTING.md). Reach out to us at [Discord](https://discord.gg/jbaHfsRVBW) if you have any questions or issues.

## 📄 License

Source code in this repository is made available under the [Apache License Version 2.0](LICENSE.md).
