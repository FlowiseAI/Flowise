# Flowise - Construa Agentes de IA, Visualmente

[![Notas de Lançamento](https://img.shields.io/github/release/FlowiseAI/Flowise)](https://github.com/FlowiseAI/Flowise/releases)
[![Discord](https://img.shields.io/discord/1087698854775881778?label=Discord&logo=discord)](https://discord.gg/jbaHfsRVBW)
[![Twitter Follow](https://img.shields.io/twitter/follow/FlowiseAI?style=social)](https://twitter.com/FlowiseAI)
[![Gráfico de Estrelas GitHub](https://img.shields.io/github/stars/FlowiseAI/Flowise?style=social)](https://star-history.com/#FlowiseAI/Flowise)
[![GitHub fork](https://img.shields.io/github/forks/FlowiseAI/Flowise?style=social)](https://github.com/FlowiseAI/Flowise/fork)

[English](../README.md) | [繁體中文](./README-TW.md) | [简体中文](./README-ZH.md) | [日本語](./README-JA.md) | [한국어](./README-KR.md) | **Português Brasileiro**

<h3>Construa Agentes de IA Visualmente</h3>

Plataforma de desenvolvimento de IA generativa de código aberto para construir agentes de IA, orquestração de LLM e muito mais

## ⚡ Início Rápido

Baixe e instale o [NodeJS](https://nodejs.org/en/download) >= 18.15.0

1. Instale o Flowise
    ```bash
    npm install -g flowise
    ```
2. Inicie o Flowise
    ```bash
    npx flowise start
    ```

    Com nome de usuário e senha

    ```bash
    npx flowise start --FLOWISE_USERNAME=usuário --FLOWISE_PASSWORD=senha
    ```

3. Abra [http://localhost:3000](http://localhost:3000)

## 🐳 Docker

### Imagem Docker

1. Construa a imagem Docker localmente:
    ```bash
    docker build --no-cache -t flowise .
    ```
2. Execute a imagem:

    ```bash
    docker run -d --name flowise -p 3000:3000 flowise
    ```

3. Abra [http://localhost:3000](http://localhost:3000)

Você pode também especificar a porta:

```bash
docker run -d --name flowise -p 3000:3000 -e PORT=3000 flowise
```

### Docker Compose

1. Vá para a pasta `docker`
2. Crie um arquivo `.env` e especifique as variáveis de ambiente `PORT` (consulte `.env.example`)
3. Execute `docker-compose up -d`
4. Abra [http://localhost:3000](http://localhost:3000)
5. Você pode trazer os contêineres para baixo executando `docker-compose stop`

## 👨‍💻 Desenvolvedores

O Flowise possui 3 módulos diferentes em um mono repositório.

-   `server`: Backend Node que fornece lógica da API
-   `ui`: Frontend React
-   `components`: Integrações de nós de terceiros

### Pré-requisitos

-   [NodeJS](https://nodejs.org/en/download) >= 18.15.0
-   [pnpm](https://pnpm.io/installation) (Se você não tiver o pnpm instalado, execute: `npm i -g pnpm`)

### Configuração

1. Clone o repositório

    ```bash
    git clone https://github.com/FlowiseAI/Flowise.git
    ```

2. Vá para a pasta do repositório

    ```bash
    cd Flowise
    ```

3. Instale todas as dependências de todos os módulos:

    ```bash
    pnpm install
    ```

4. Construa todos os códigos:

    ```bash
    pnpm build
    ```

5. Execute o aplicativo:

    ```bash
    pnpm start
    ```

    Agora você pode acessar o aplicativo em [http://localhost:3000](http://localhost:3000)

6. Para desenvolvimento:

    ```bash
    pnpm dev
    ```

    Qualquer mudança de código irá recarregar automaticamente o aplicativo em [http://localhost:8080](http://localhost:8080)

## 🌱 Variáveis de Ambiente

Flowise suporta diferentes variáveis de ambiente para configurar sua instância. Você pode especificar as seguintes variáveis no arquivo `.env` dentro da pasta `packages/server`. Leia [mais](https://github.com/FlowiseAI/Flowise/blob/main/CONTRIBUTING.md#-env-variables)

## 📖 Documentação

[Documentação do Flowise](https://docs.flowiseai.com/)

## 🌐 Auto-hospedagem

Implante o Flowise auto-hospedado em sua infraestrutura existente, oferecemos suporte a várias [implantações](https://docs.flowiseai.com/configuration/deployment)

-   [AWS](https://docs.flowiseai.com/deployment/aws)
-   [Azure](https://docs.flowiseai.com/deployment/azure)
-   [Digital Ocean](https://docs.flowiseai.com/deployment/digital-ocean)
-   [GCP](https://docs.flowiseai.com/deployment/gcp)

## ☁️ Hospedagem em Nuvem

[Comece a usar o Flowise Cloud](https://flowiseai.com/)

## 🙋 Suporte

Sinta-se à vontade para fazer qualquer pergunta, relatar problemas e solicitar novos recursos no [discussions](https://github.com/FlowiseAI/Flowise/discussions)

## 🙌 Contribuindo

Consulte o [guia de contribuição](https://github.com/FlowiseAI/Flowise/blob/main/CONTRIBUTING.md). Acesse nosso [Discord](https://discord.gg/jbaHfsRVBW) para participar da conversa.

[![Contribuidores](https://contrib.rocks/image?repo=FlowiseAI/Flowise)](https://github.com/FlowiseAI/Flowise/graphs/contributors)

## 📄 Licença

Código fonte neste repositório disponibilizado sob a [Licença Apache 2.0](https://github.com/FlowiseAI/Flowise/blob/main/LICENSE.md).