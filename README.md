<!-- markdownlint-disable MD030 -->

<img width="100%" src="https://github.com/SAIAAI/SAIA/blob/main/images/SAIA.png?raw=true"></a>

# SAIA - Build LLM Apps Easily

[![Release Notes](https://img.shields.io/github/release/SAIAAI/SAIA)](https://github.com/SAIAAI/SAIA/releases)
[![Discord](https://img.shields.io/discord/1087698854775881778?label=Discord&logo=discord)](https://discord.gg/jbaHfsRVBW)
[![Twitter Follow](https://img.shields.io/twitter/follow/SAIAAI?style=social)](https://twitter.com/SAIAAI)
[![GitHub star chart](https://img.shields.io/github/stars/SAIAAI/SAIA?style=social)](https://star-history.com/#SAIAAI/SAIA)
[![GitHub fork](https://img.shields.io/github/forks/SAIAAI/SAIA?style=social)](https://github.com/SAIAAI/SAIA/fork)

English | [中文](./README-ZH.md)

<h3>Drag & drop UI to build your customized LLM flow</h3>
<a href="https://github.com/SAIAAI/SAIA">
<img width="100%" src="https://github.com/SAIAAI/SAIA/blob/main/images/SAIA.gif?raw=true"></a>

## ⚡Quick Start

Download and Install [NodeJS](https://nodejs.org/en/download) >= 18.15.0

1. Install SAIA
    ```bash
    npm install -g SAIA
    ```
2. Start SAIA

    ```bash
    npx SAIA start
    ```

    With username & password

    ```bash
    npx SAIA start --SAIA_USERNAME=user --SAIA_PASSWORD=1234
    ```

3. Open [http://localhost:3000](http://localhost:3000)

## 🐳 Docker

### Docker Compose

1. Go to `docker` folder at the root of the project
2. Copy `.env.example` file, paste it into the same location, and rename to `.env`
3. `docker-compose up -d`
4. Open [http://localhost:3000](http://localhost:3000)
5. You can bring the containers down by `docker-compose stop`

### Docker Image

1. Build the image locally:
    ```bash
    docker build --no-cache -t SAIA .
    ```
2. Run image:

    ```bash
    docker run -d --name SAIA -p 3000:3000 SAIA
    ```

3. Stop image:
    ```bash
    docker stop SAIA
    ```

## 👨‍💻 Developers

SAIA has 3 different modules in a single mono repository.

-   `server`: Node backend to serve API logics
-   `ui`: React frontend
-   `components`: Langchain components

### Prerequisite

-   Install [Yarn v1](https://classic.yarnpkg.com/en/docs/install)
    ```bash
    npm i -g yarn
    ```

### Setup

1. Clone the repository

    ```bash
    git clone https://github.com/SAIAAI/SAIA.git
    ```

2. Go into repository folder

    ```bash
    cd SAIA
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

    - Create `.env` file and specify the `PORT` (refer to `.env.example`) in `packages/ui`
    - Create `.env` file and specify the `PORT` (refer to `.env.example`) in `packages/server`
    - Run

        ```bash
        yarn dev
        ```

    Any code changes will reload the app automatically on [http://localhost:8080](http://localhost:8080)

## 🔒 Authentication

To enable app level authentication, add `SAIA_USERNAME` and `SAIA_PASSWORD` to the `.env` file in `packages/server`:

```
SAIA_USERNAME=user
SAIA_PASSWORD=1234
```

## 🌱 Env Variables

SAIA support different environment variables to configure your instance. You can specify the following variables in the `.env` file inside `packages/server` folder. Read [more](https://github.com/SAIAAI/SAIA/blob/main/CONTRIBUTING.md#-env-variables)

## 📖 Documentation

[SAIA Docs](https://docs.SAIAai.com/)

## 🌐 Self Host

### [Railway](https://docs.SAIAai.com/deployment/railway)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/pn4G8S?referralCode=WVNPD9)

### [Render](https://docs.SAIAai.com/deployment/render)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://docs.SAIAai.com/deployment/render)

### [Elestio](https://elest.io/open-source/SAIAai)

[![Deploy](https://pub-da36157c854648669813f3f76c526c2b.r2.dev/deploy-on-elestio-black.png)](https://elest.io/open-source/SAIAai)

### [HuggingFace Spaces](https://docs.SAIAai.com/deployment/hugging-face)

<a href="https://huggingface.co/spaces/SAIAAI/SAIA"><img src="https://huggingface.co/datasets/huggingface/badges/raw/main/open-in-hf-spaces-sm.svg" alt="HuggingFace Spaces"></a>

### [AWS](https://docs.SAIAai.com/deployment/aws)

### [Azure](https://docs.SAIAai.com/deployment/azure)

### [DigitalOcean](https://docs.SAIAai.com/deployment/digital-ocean)

### [GCP](https://docs.SAIAai.com/deployment/gcp)

## 💻 Cloud Hosted

Coming soon

## 🙋 Support

Feel free to ask any questions, raise problems, and request new features in [discussion](https://github.com/SAIAAI/SAIA/discussions)

## 🙌 Contributing

Thanks go to these awesome contributors

<a href="https://github.com/SAIAAI/SAIA/graphs/contributors">
<img src="https://contrib.rocks/image?repo=SAIAAI/SAIA" />
</a>

See [contributing guide](CONTRIBUTING.md). Reach out to us at [Discord](https://discord.gg/jbaHfsRVBW) if you have any questions or issues.
[![Star History Chart](https://api.star-history.com/svg?repos=SAIAAI/SAIA&type=Timeline)](https://star-history.com/#SAIAAI/SAIA&Date)

## 📄 License

Source code in this repository is made available under the [Apache License Version 2.0](LICENSE.md).
