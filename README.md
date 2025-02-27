<!-- markdownlint-disable MD030 -->
<!-- TODO: Add banner for answerAI  -->
<!-- <img width="100%" src="https://github.com/the-answerai/theanswer/blob/main/images/flowise.png?raw=true"></a> -->

# TheAnswer - Build LLM Apps Easily with Flowise

[![Discord](https://img.shields.io/discord/1087698854775881778?label=Discord&logo=discord)](https://discord.gg/jbaHfsRVBW)
[![Twitter Follow](https://img.shields.io/twitter/follow/TheAnswerAI?style=social)](https://twitter.com/TheAnswerAI)
[![GitHub star chart](https://img.shields.io/github/stars/the-answerai/theanswer?style=social)](https://star-history.com/#the-answerai/theanswer)
[![GitHub fork](https://img.shields.io/github/forks/the-answerai/theanswer?style=social)](https://github.com/the-answerai/theanswer/fork)

<!-- English | [中文](./i18n/README-ZH.md) | [日本語](./i18n/README-JA.md) | [한국어](./i18n/README-KR.md) -->

<h3>Drag & drop UI to build your customized LLM Flowise with The AnswerAI</h3>
<a href="https://github.com/the-answerai/theanswer">
<img width="100%" src="https://github.com/the-answerai/theanswer/blob/main/images/flowise.gif?raw=true"></a>

## 🌟 What is TheAnswer?

TheAnswer is a revolutionary AI-powered productivity suite that empowers individuals and organizations to streamline their workflows, enhance decision-making, and boost creativity. Built on top of the popular open-source project Flowise, TheAnswer extends its capabilities to provide a comprehensive set of tools designed to tackle a wide range of tasks with unprecedented efficiency and intelligence.

### TheAnswer and Flowise

TheAnswer builds upon Flowise, a powerful open-source tool for creating customized LLM flows. While Flowise provides the foundation for AI-powered workflows, TheAnswer extends these capabilities and integrates a wide range of additional services to create a comprehensive productivity suite.

Key aspects of TheAnswer's approach:

-   Leverages Flowise's drag-and-drop interface for building AI workflows
-   Extends Flowise's functionality with additional UI components and features
-   Integrates seamlessly with Flowise projects

### Integration with Multiple Services

TheAnswer goes beyond Flowise integration, offering a growing ecosystem of services to enhance your AI-powered workflows:

1. **Langfuse**: For LLM observability and analytics
2. **Make.com**: To create complex automated workflows
3. **n8n**: For workflow automation and integration
4. **Auth0**: For robust user management, organizations, and permissions
5. **Other AI and Productivity Tools**: Continuously expanding integrations with various services

This multi-service approach allows TheAnswer to offer a more versatile and powerful solution, catering to a wide range of business needs and use cases.

### Key Features

1. **AI Sidekicks (Chatflows)**: Task-specific AI assistants for various purposes, built using Flowise and enhanced with TheAnswer's capabilities.
2. **Document Stores**: Connect and access data from multiple third-party services.
3. **Powerful Tools Integration**: Leverage various tools and services to extend AI capabilities beyond Flowise's core functionality.
4. **Developer-Friendly Platform**: Customizable AI models and workflows with API access, compatible with Flowise and other integrated services.
5. **Shareable Chatbots**: Easily deploy and share custom AI Sidekicks.
6. **Composable Architecture**: Mix and match services like Flowise, Langfuse, Make.com, and n8n to create tailored solutions.
7. **Advanced User Management**: Utilize Auth0 for secure user authentication, organization management, and granular permissions control.

## ⚡Quick Start

There are two main ways to get started with TheAnswer: local development setup and deployment on Render.

### Local Development Setup

1. Clone the repository:

    ```bash
    git clone https://github.com/the-answerai/theanswer.git
    cd theanswer
    ```

2. Initialize and update git submodules:

    ```bash
    git submodule update --init
    ```

3. Set up environment variables:

    - Create `.env` files in the following locations:
        - `/packages/server/.env`
        - `/packages/ui/.env`
        - `/apps/web/.env`
        - `/.env` (root directory)

    If `.env.example` files are not available, please reach out to The AnswerAI team for the required environment variables. These files contain sensitive configuration details needed for local development.

    **Note:** For local development, you'll need to be added to the Auth0 development team with appropriate permissions (Member role or above). Please contact The AnswerAI team to get access.

4. Database Setup:

    - Install and open [DBeaver](https://dbeaver.io/)
    - Connect to your PostgreSQL instance
    - Create a new database named `flowise`
    - Configure the database connection in your `.env` files

5. Install dependencies:

    ```bash
    pnpm install
    ```

6. Build the project:

    ```bash
    pnpm build
    ```

    If you encounter any database or Prisma-related issues:

    - Try rebuilding with force: `pnpm build --force`
    - If issues persist, run migrations: `pnpm db:migrate`
    - Then rebuild again: `pnpm build --force`

7. Start the development server:

    ```bash
    pnpm dev
    ```

8. Open [http://localhost:3000](http://localhost:3000) in your browser to access TheAnswer.

### Deploy on Render (Recommended for Easy Setup)

For a quick and easy setup, we recommend deploying TheAnswer on Render:

1. Click the "Deploy to Render" button below:

    [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/the-answerai/theanswer)

2. Follow the prompts on Render to complete the deployment process.

3. Once deployed, you'll receive a URL to access your TheAnswer instance.

For detailed instructions on both local development and Render deployment, please refer to our [documentation](https://docs.theanswer.ai/).

Note: The standalone TheAnswer CLI tool is currently under development. Stay tuned for updates on its release and installation process.

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
-   `ui`: React frontend for Flowise
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

This structure allows TheAnswer to build upon Flowise's core functionality while adding its own features and customizations. The TheAnswer-specific packages extend and enhance the capabilities of the original Flowise project, providing additional tools for AI-powered productivity and workflow management.

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

    Any code changes will reload the app automatically on [http://localhost:3000](http://localhost:3000)

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

    -   [Sealos](https://cloud.sealos.io/?openapp=system-template%3Dtheanswer)

        [![](https://raw.githubusercontent.com/labring-actions/templates/main/Deploy-on-Sealos.svg)](https://cloud.sealos.io/?openapp=system-template%3Dtheanswer)

    -   [RepoCloud](https://repocloud.io/details/?app_id=29)

        [![Deploy on RepoCloud](https://d16t0pc4846x52.cloudfront.net/deploy.png)](https://repocloud.io/details/?app_id=29)

      </details>

## 💻 Cloud Hosted

Visit [https://theanswer.ai/](https://theanswer.ai/) to learn more about our cloud-hosted solution.

## 🙋 Support

Feel free to ask any questions, raise problems, and request new features in [discussion](https://github.com/the-answerai/theanswer/discussions)

## 🙌 Contributing

We welcome contributions to TheAnswer! Whether you're fixing bugs, improving documentation, or proposing new features, your efforts are appreciated. Here's how you can contribute:

1. **Fork the Repository**: Start by forking the TheAnswer repository to your GitHub account.

2. **Create a Branch**: Create a new branch for your contribution.

3. **Make Your Changes**:

    - For bug fixes and minor improvements, feel free to submit a pull request directly.
    - For new features or significant changes, please open an issue first to discuss the proposed changes.
    - When extending Flowise functionality, ensure your changes are compatible with both Flowise and TheAnswer.

4. **Test Your Changes**: Ensure your changes don't break existing functionality and add tests if applicable.

5. **Submit a Pull Request**: Once you're satisfied with your changes, submit a pull request to the main TheAnswer repository.

6. **Code Review**: Wait for the maintainers to review your pull request. Be open to feedback and make necessary adjustments.

For detailed contribution guidelines, please refer to our [CONTRIBUTING.md](CONTRIBUTING.md) file.

### Contribution to Flowise Core

If your contribution is related to Flowise core functionality, consider submitting it to the [Flowise repository](https://github.com/FlowiseAI/Flowise) first. Once accepted, we can integrate it into TheAnswer.

Thanks go to these awesome contributors of both TheAnswer and the original Flowise project:

<a href="https://github.com/the-answerai/theanswer/graphs/contributors">
<img src="https://contrib.rocks/image?repo=the-answerai/theanswer" />
</a>

Reach out to us on [Discord](https://discord.gg/jbaHfsRVBW) if you have any questions or need assistance with your contribution.

## 📄 License

Source code in this repository is made available under the [Apache License Version 2.0](LICENSE.md).
