<!-- markdownlint-disable MD030 -->

<p align="center">
<img src="https://github.com/FlowiseAI/Flowise/blob/main/images/flowise_white.svg#gh-light-mode-only">
<img src="https://github.com/FlowiseAI/Flowise/blob/main/images/flowise_dark.svg#gh-dark-mode-only">
</p>

<div align="center">

[![Release Notes](https://img.shields.io/github/release/FlowiseAI/Flowise)](https://github.com/FlowiseAI/Flowise/releases)
[![Discord](https://img.shields.io/discord/1087698854775881778?label=Discord&logo=discord)](https://discord.gg/jbaHfsRVBW)
[![Twitter Follow](https://img.shields.io/twitter/follow/FlowiseAI?style=social)](https://twitter.com/FlowiseAI)
[![GitHub star chart](https://img.shields.io/github/stars/FlowiseAI/Flowise?style=social)](https://star-history.com/#FlowiseAI/Flowise)
[![GitHub fork](https://img.shields.io/github/forks/FlowiseAI/Flowise?style=social)](https://github.com/FlowiseAI/Flowise/fork)

Inglês | [繁體中文](./i18n/README-TW.md) | [简体中文](./i18n/README-ZH.md) | [日本語](./i18n/README-JA.md) | [한국어](./i18n/README-KR.md)

</div>

<h3>Construa Agentes de IA Visualmente</h3>
<a href="https://github.com/FlowiseAI/Flowise">
<img width="100%" src="https://github.com/FlowiseAI/Flowise/blob/main/images/flowise_agentflow.gif?raw=true"></a>

## 📚 Índice

- [⚡ Início Rápido](#-início-rápido)
- [🐳 Docker](#-docker)
- [👨‍💻 Desenvolvedores](#-desenvolvedores)
- [🌱 Variáveis de Ambiente](#-variáveis-de-ambiente)
- [📖 Documentação](#-documentação)
- [🌐 Self Host](#-self-host)
- [☁️ Flowise Cloud](#️-flowise-cloud)
- [🙋 Suporte](#-suporte)
- [🙌 Contribuindo](#-contribuindo)
- [📄 Licença](#-licença)

## ⚡ Início Rápido

Baixe e instale [NodeJS](https://nodejs.org/en/download) >= 18.15.0

1. Instale o Flowise
    ```bash
    npm install -g flowise
    ```
2. Inicie o Flowise
    ```bash
    npx flowise start
    ```
3. Abra [http://localhost:3000](http://localhost:3000)

## 🐳 Docker

### Docker Compose

1. Clone o projeto Flowise
2. Acesse a pasta `docker` na raiz do projeto
3. Copie o arquivo `.env.example`, cole no mesmo local e renomeie para `.env`
4. `docker compose up -d`
5. Abra [http://localhost:3000](http://localhost:3000)
6. Para parar os containers, use `docker compose stop`

### Imagem Docker

1. Construa a imagem localmente:
    ```bash
    docker build --no-cache -t flowise .
    ```
2. Execute a imagem:
    ```bash
    docker run -d --name flowise -p 3000:3000 flowise
    ```
3. Pare a imagem:
    ```bash
    docker stop flowise
    ```

## 👨‍💻 Desenvolvedores

O Flowise possui 3 módulos diferentes em um único monorepositório.

- `server`: Backend Node para servir as lógicas de API
- `ui`: Frontend em React
- `components`: Integrações de nós de terceiros
- `api-documentation`: Documentação Swagger-UI gerada automaticamente a partir do Express

### Pré-requisito

- Instale o [PNPM](https://pnpm.io/installation)
    ```bash
    npm i -g pnpm
    ```

### Configuração

1. Clone o repositório:
    ```bash
    git clone https://github.com/FlowiseAI/Flowise.git
    ```
2. Entre na pasta do repositório:
    ```bash
    cd Flowise
    ```
3. Instale todas as dependências de todos os módulos:
    ```bash
    pnpm install
    ```
4. Compile todo o código:
    ```bash
    pnpm build
    ```
    <details>
    <summary>Código de saída 134 (JavaScript heap out of memory)</summary>
    Se você receber esse erro ao rodar o build, tente aumentar o heap do Node.js e rode novamente:
    ```bash
    # macOS / Linux / Git Bash
    export NODE_OPTIONS="--max-old-space-size=4096"

    # Windows PowerShell
    $env:NODE_OPTIONS="--max-old-space-size=4096"

    # Windows CMD
    set NODE_OPTIONS=--max-old-space-size=4096
    ```
    Então execute:
    ```bash
    pnpm build
    ```
    </details>
5. Inicie o app:
    ```bash
    pnpm start
    ```
    Agora você pode acessar o app em [http://localhost:3000](http://localhost:3000)

6. Para build de desenvolvimento:
    - Crie o arquivo `.env` e especifique o `VITE_PORT` (consulte `.env.example`) em `packages/ui`
    - Crie o arquivo `.env` e especifique o `PORT` (consulte `.env.example`) em `packages/server`
    - Execute:
        ```bash
        pnpm dev
        ```
    Qualquer alteração recarregará o app automaticamente em [http://localhost:8080](http://localhost:8080)

## 🌱 Variáveis de Ambiente

O Flowise suporta diferentes variáveis de ambiente para configurar sua instância. Você pode especificar as variáveis no arquivo `.env` dentro da pasta `packages/server`. Leia [mais](https://github.com/FlowiseAI/Flowise/blob/main/docs/configuration/environment-variables.md).

## 📖 Documentação

Você pode acessar a documentação do Flowise [aqui](https://docs.flowiseai.com/)

## 🌐 Self Host

Faça deploy do Flowise auto-hospedado em sua infraestrutura. Suportamos vários [deployments](https://docs.flowiseai.com/configuration/deployment):

- [AWS](https://docs.flowiseai.com/configuration/deployment/aws)
- [Azure](https://docs.flowiseai.com/configuration/deployment/azure)
- [Digital Ocean](https://docs.flowiseai.com/configuration/deployment/digital-ocean)
- [GCP](https://docs.flowiseai.com/configuration/deployment/gcp)
- [Alibaba Cloud](https://computenest.console.aliyun.com/service/instance/create/default?type=user&ServiceName=Flowise社区版)
- Outros: Railway, Render, HuggingFace Spaces, Elestio, Sealos, RepoCloud (veja os detalhes no README original)

## ☁️ Flowise Cloud

Comece com o [Flowise Cloud](https://flowiseai.com/).

## 🙋 Suporte

Fique à vontade para tirar dúvidas, relatar problemas ou sugerir novas funcionalidades em [Discussion](https://github.com/FlowiseAI/Flowise/discussions).

## 🙌 Contribuindo

Agradecimentos aos incríveis contribuidores

Veja o [Guia de Contribuição](CONTRIBUTING.md). Participe do nosso [Discord](https://discord.gg/jbaHfsRVBW) se tiver dúvidas ou problemas.

## 📄 Licença

O código-fonte deste repositório está disponível sob a [Licença Apache versão 2.0](LICENSE.md).