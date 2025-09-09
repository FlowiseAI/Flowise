<!-- markdownlint-disable MD030 -->
<!-- TODO: Add banner for answerAI  -->
<!-- <img width="100%" src="https://github.com/the-answerai/theanswer/blob/main/images/flowise.png?raw=true"></a> -->

<!-- <p align="center">
<img src="https://github.com/the-answerai/theanswer/blob/main/images/flowise_white.svg#gh-light-mode-only">
<img src="https://github.com/the-answerai/theanswer/blob/main/images/flowise_dark.svg#gh-dark-mode-only">
</p> -->

[![Release Notes](https://img.shields.io/github/release/the-answerai/theanswer)](https://github.com/the-answerai/theanswer/releases)
[![Discord](https://img.shields.io/discord/1087698854775881778?label=Discord&logo=discord)](https://discord.gg/jbaHfsRVBW)
[![Twitter Follow](https://img.shields.io/twitter/follow/TheAnswerAI?style=social)](https://twitter.com/TheAnswerAI)
[![GitHub star chart](https://img.shields.io/github/stars/the-answerai/theanswer?style=social)](https://star-history.com/#the-answerai/theanswer)
[![GitHub fork](https://img.shields.io/github/forks/the-answerai/theanswer?style=social)](https://github.com/the-answerai/theanswer/fork)

English | [繁體中文](./i18n/README-TW.md) | [简体中文](./i18n/README-ZH.md) | [日本語](./i18n/README-JA.md) | [한국어](./i18n/README-KR.md)

<h3>Build AI Agents, Visually</h3>
<a href="https://github.com/the-answerai/theanswer">
<img width="100%" src="https://github.com/the-answerai/theanswer/blob/main/images/flowise_agentflow.gif?raw=true"></a>

## ⚡Quick Start

There are two main ways to get started with TheAnswer: local development setup and deployment on Render.

### Local Development Setup

1. **Clone the repository:**

    ```bash
    # Recommended: Clone with submodules included
    git clone --recursive https://github.com/the-answerai/theanswer.git
    cd theanswer
    ```

    **Alternative:** If you already cloned without submodules:

    ```bash
    git clone https://github.com/the-answerai/theanswer.git
    cd theanswer
    git submodule update --init
    ```

2. **Set up environment variables:**

    - Create a `.env` file in the root directory
    - If `.env.example` files are not available, contact The AnswerAI team for required environment variables
    - Use `API_HOST` to specify your API server host. All API requests automatically include the `/api/v1` prefix.
    - `API_BASE_URL` is deprecated and should not be used.
    - **Note:** For local development, you'll need Auth0 development team access (Member role or above)

3. **Verify submodules are initialized:**

    ```bash
    git submodule status
    ```

    You should see output like:

    ```
    +050ca236891420946884c68ff8d74cbeb0cbe7ef packages/embed (aai-embed@3.0.3-23-g050ca23)
    ```

    **If submodules are not initialized** (empty directories or missing files), or if you need to update to the correct version, run:

    ```bash
    # This will initialize, update, and force reset submodules to the correct commits
    pnpm submodule:init
    ```

    **For a complete reset** (if you're having persistent issues):

    ```bash
    # Remove and reinitialize all submodules
    pnpm submodule:reset
    ```

    **Note:** This repository uses git submodules. The `packages/embed` submodule contains the chat embed functionality. See [CONTRIBUTING.md](CONTRIBUTING.md#git-submodules) for detailed submodule management instructions.

4. **Install dependencies:**

    ```bash
    pnpm install
    ```

5. **Install Docker Desktop:**

    - Download and install [Docker Desktop](https://www.docker.com/products/docker-desktop/)
    - Ensure Docker is running before proceeding

6. **Set up database and redis locally:**

    ```bash
    pnpm dev-docker
    ```

7. **Optional: Install database tool**

    - Install [DBeaver](https://dbeaver.io/) for database management
    - Connect to PostgreSQL: localhost, example_user, example_password

8. **Build and migrate the initial database:**

    ```bash
    pnpm build && pnpm db:migrate
    ```

9. **Run the application:**

    ```bash
    pnpm start
    ```

10. **Access TheAnswer:**

    - After the build completes and the app starts, you should see logs stating that the server started on 'http://localhost:3000'
    - Open [http://localhost:3000](http://localhost:3000) in your browser
    - Verify you can login and access the application

11. **For development:**
    - After initial setup, you can fast reload to test your changes using:
    ```bash
    pnpm dev
    ```

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

1. Clone the Flowise project
2. Go to `docker` folder at the root of the project
3. Copy `.env.example` file, paste it into the same location, and rename to `.env` file
4. `docker compose up -d`
5. Open [http://localhost:3000](http://localhost:3000)
6. You can bring the containers down by `docker compose stop`

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
-   `api-documentation`: Auto-generated swagger-ui API docs from express

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

## 🧪 Testing

TheAnswer includes comprehensive end-to-end testing with Playwright for critical user journeys including role-based authentication and menu permissions.

### Quick Start Testing

```bash
# Install Playwright browsers (required first time)
pnpm test:e2e:setup

# Run tests with visual UI interface (recommended)
pnpm test:e2e

# Debug mode with step-by-step inspection
pnpm test:e2e:debug
```

### Testing Features

-   **🎨 Playwright UI Mode**: Visual test execution with real-time screenshots
-   **🔐 Auth0 Integration**: Automated authentication flow testing with organization selection
-   **👥 Role-Based Testing**: Tests for Admin, Builder, and Member user permissions with menu visibility verification
-   **🎯 Precise Organization Selection**: Uses Auth0 organization ID for accurate organization matching
-   **📊 Organized Output**: Test results, reports, and artifacts in organized folders
-   **🚀 Auto Dev Server**: Tests automatically start/stop the development server
-   **🔍 Debug Tools**: Step-by-step debugging with browser inspection
-   **🤖 Auto Browser Setup**: Automatic browser installation when needed

### Test Setup

1. **Install Playwright browsers:**

    ```bash
    pnpm test:e2e:setup
    ```

2. **Copy test environment file:**

    ```bash
    cp apps/web/e2e/env.example apps/web/.env.test
    ```

3. **Configure test credentials in `.env.test`:**

    - `TEST_USER_ENTERPRISE_ADMIN_EMAIL`: Your Auth0 admin test user email (e.g., `alpha+enterprise-admin@domain.ai`)
    - `TEST_USER_ENTERPRISE_BUILDER_EMAIL`: Your Auth0 builder test user email (e.g., `alpha+enterprise-builder@domain.ai`)
    - `TEST_USER_ENTERPRISE_MEMBER_EMAIL`: Your Auth0 member test user email (e.g., `alpha+enterprise-member@domain.ai`)
    - `TEST_USER_PASSWORD`: Shared password for all test users
    - `TEST_ENTERPRISE_AUTH0_ORG_ID`: Auth0 organization ID for precise selection (e.g., `org_unQ8OLmTNsxVTJCT`)
    - `TEST_ENTERPRISE_ORG_NAME`: Organization display name (e.g., "Local Dev")
    - Auth0 configuration (matching your dev environment)

4. **Run tests:**
    ```bash
    pnpm test:e2e:dev  # Visual UI mode
    pnpm test:e2e:debug  # Step-by-step debugging
    ```

For detailed testing documentation, see:

-   [E2E Testing Guide](apps/web/e2e/README.md)
-   [Testing Strategy](TESTING_STRATEGY.md)

## 📖 Documentation

[AnswerAgent Docs](https://answeragent.ai/docs)

## 🌐 Self Host

Deploy AnswerAgent self-hosted in your existing infrastructure. We support various [deployments](https://answeragent.ai/docs/developers/deployment)

-   [AWS](https://answeragent.ai/docs/developers/deployment/aws)
-   [Azure](https://answeragent.ai/docs/developers/deployment/azure)
-   [GCP](https://answeragent.ai/docs/developers/deployment/gcp)
-   [Render](https://answeragent.ai/docs/developers/deployment/render)

## 🔐 AWS Secrets Manager Integration

For AWS deployments, AnswerAgent supports using AWS Secrets Manager to securely store the Flowise encryption key instead of environment variables.

### Quick Setup

1. **Create the encryption key secret:**

    ```bash
    aws secretsmanager create-secret \
      --name FlowiseEncryptionKey \
      --secret-string 'your-secure-encryption-key-here'
    ```

2. **Update an existing secret:**

    ```bash
    aws secretsmanager put-secret-value \
      --secret-id FlowiseEncryptionKey \
      --secret-string 'your-new-encryption-key-here'
    ```

3. **Add to your environment variables:**
    ```bash
    # Flowise Encryption Key Override - AWS Secrets Manager
    SECRETKEY_STORAGE_TYPE="aws"
    SECRETKEY_AWS_REGION="us-east-1"
    SECRETKEY_AWS_NAME="FlowiseEncryptionKey"
    ```

### Benefits

-   **Enhanced Security**: Keys are encrypted at rest and in transit
-   **Key Rotation**: Easy rotation without application restarts
-   **Audit Trail**: Full access logging and monitoring
-   **IAM Integration**: Fine-grained access control

For detailed AWS deployment instructions, see [AWS Deployment Guide](https://answeragent.ai/docs/developers/deployment/aws).

-   <details>
      <summary>Others</summary>

    -   [Railway](https://answeragent.ai/docs/developers/deployment/railway)

        [![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/pn4G8S?referralCode=WVNPD9)

    -   [Render](https://answeragent.ai/docs/developers/deployment/render)

        [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://answeragent.ai/docs/developers/deployment/render)

    -   [HuggingFace Spaces](https://answeragent.ai/docs/deployment/hugging-face)

        <a href="https://huggingface.co/spaces/TheAnswer/TheAnswer"><img src="https://huggingface.co/datasets/huggingface/badges/raw/main/open-in-hf-spaces-sm.svg" alt="HuggingFace Spaces"></a>

    -   [Elestio](https://elest.io/open-source/theanswer)

        [![Deploy on Elestio](https://elest.io/images/logos/deploy-to-elestio-btn.png)](https://elest.io/open-source/theanswer)

    -   [Sealos](https://template.sealos.io/deploy?templateName=flowise)

        [![Deploy on Sealos](https://sealos.io/Deploy-on-Sealos.svg)](https://template.sealos.io/deploy?templateName=flowise)

    -   [RepoCloud](https://repocloud.io/details/?app_id=29)

        [![Deploy on RepoCloud](https://d16t0pc4846x52.cloudfront.net/deploy.png)](https://repocloud.io/details/?app_id=29)

      </details>

## ☁️ Flowise Cloud

[Get Started with Flowise Cloud](https://theanswer.ai/)

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

If your contribution is related to Flowise core functionality, consider submitting it to the [Flowise repository](https://github.com/theanswer/Flowise) first. Once accepted, we can integrate it into TheAnswer.

Thanks go to these awesome contributors of both TheAnswer and the original Flowise project:

<a href="https://github.com/the-answerai/theanswer/graphs/contributors">
<img src="https://contrib.rocks/image?repo=the-answerai/theanswer" />
</a>

Reach out to us on [Discord](https://discord.gg/jbaHfsRVBW) if you have any questions or need assistance with your contribution.

## 📄 License

Source code in this repository is made available under the [Apache License Version 2.0](LICENSE.md).

## 🔑 Seeding Default Credentials

TheAnswer provides a script to automatically seed default credentials (API keys, service tokens, etc) into the Flowise database from environment variables. This is useful for setting up new environments or automating credential management.

-   **Safe by default:** Running `pnpm seed-credentials` will perform a dry-run (test mode) and show what would be seeded, but will NOT write to the database.
-   **To actually write credentials:** Use `pnpm seed-credentials:write` to perform the operation and insert/update credentials in the database.
-   **Full documentation:** See [`scripts/seed-credentials/README.md`](./scripts/seed-credentials/README.md) for detailed instructions, environment variable requirements, and advanced usage.

**Example:**

```bash
# Test mode (safe, dry-run, default)
pnpm seed-credentials

# Production mode (actually writes credentials)
pnpm seed-credentials:write
```

The script supports a wide range of credential types and includes robust safety checks. For more details, troubleshooting, and environment variable examples, refer to the [seed-credentials README](./scripts/seed-credentials/README.md).

## 🔒 Lacework Security Integration

TheAnswer supports optional Lacework FortiCNAPP Agent integration for runtime security monitoring and anomaly detection in AWS Fargate deployments.

### Quick Setup

**Enable Lacework:**

1. Add `LaceworkAccessToken=your_token_here` to your `copilot.{environment}.env` file
2. Deploy with `copilot deploy --env your-environment`

**Disable Lacework:**

1. Remove or comment out `LaceworkAccessToken` from your environment file
2. Deploy with `copilot deploy --env your-environment`

### Key Features

-   **Optional Integration**: Controlled by presence of `LaceworkAccessToken`
-   **Graceful Fallback**: Application runs normally if Lacework token is not provided
-   **Non-Essential Sidecar**: Sidecar failure doesn't affect main application startup
-   **AWS Fargate Optimized**: Designed for Copilot deployments

### Verification

```bash
# Connect to container
copilot svc exec --env your-environment

# Check Lacework status
ps aux | grep datacollector
tail -f /var/log/lacework/datacollector.log

# Check environment variables (WARNING: Do not screenshare - contains sensitive tokens)
env | grep -i lacework
```

**⚠️ Security Note**: Never screenshare or share output from commands that display Lacework tokens.

For detailed configuration, troubleshooting, and advanced setup, see [Lacework Integration Documentation](./packages/docs/docs/integrations/lacework.md).

<!-- BWS-SECURE-DOCS-START -->

## BWS Secure Environmental Variable Integration

This project uses [BWS Secure](https://github.com/last-rev-llc/bws-secure) for managing environment variables across different environments.

### Creating an Access Token

1. Visit your [Bitwarden Machine Accounts](https://vault.bitwarden.com/#/sm/${BWS_ORG_ID:-YOUR_BWS_ORG_ID_HERE}/machine-accounts) section
    - **Note:** This link requires you to be a member of the Last Rev Bitwarden organization
    - If you don't have access, please refer to the [BWS Secure documentation](https://github.com/last-rev-llc/bws-secure) or contact your team administrator
2. After clicking the link, follow these steps:
    - Select the appropriate Client/Set of Machine Accounts from the list
    - Click on the "Access Tokens" tab
    - Click "+ New Access Token" button
    - Give the token a meaningful name (e.g., "Your Name - Local Development")
    - Click "Save" to generate the token
3. Copy the displayed token (you won't be able to see it again after closing)
4. Add it to your .env file in your project root:
    ```
    BWS_ACCESS_TOKEN=your_token_here
    ```
5. Never commit this token to version control

### Updating BWS Secure

To update BWS Secure to the latest version, you can use the convenient script that was added to your package.json:

```bash
npm run bws-update  # Or use your project's package manager: yarn bws-update, pnpm bws-update
```

Alternatively, you can run the following command manually from your project root:

```bash
rm -rf scripts/bws-secure && git clone git@github.com:last-rev-llc/bws-secure.git scripts/bws-secure && rm -rf scripts/bws-secure/.git && bash scripts/bws-secure/install.sh
```

<!-- BWS-SECURE-DOCS-END -->
