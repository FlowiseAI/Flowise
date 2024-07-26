# STARTAI

## запуск проекта

### - pnpm install

### - pnpm build

### - pnpm start

English | [中文](./README-ZH.md) | [日本語](./README-JA.md) | [한국어](./README-KR.md)

<h3>Drag & drop UI to build your customized LLM flow</h3>
<a href="https://github.com/FlowiseAI/Flowise">
<img width="100%" src="https://github.com/FlowiseAI/Flowise/blob/main/images/flowise.gif?raw=true"></a>

## ⚡Quick Start

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

Flowise has 3 different modules in a single mono repository.

-   `server`: Node backend to serve API logics
-   `ui`: React frontend
-   `components`: Third-party nodes integrations

### Prerequisite

-   Install [PNPM](https://pnpm.io/installation)
    ```bash
    npm i -g pnpm
    ```

### Setup

1. Clone the repository

    ```bash
    git clone https://github.com/FlowiseAI/Flowise.git
    ```

2. Go into repository folder

    ```bash
    cd Flowise
    ```

3. Install all dependencies of all modules:

    ```bash
    pnpm install
    ```

4. Build all the code:

    ```bash
    pnpm build
    ```

5. Start the app:

    ```bash
    pnpm start
    ```

## Первый вариант запуска

### - переименовать ecosystem.config.js.example -> ecosystem.config.js

### - pm2 start + Редактируем файл для изменения порта и имени приложения ecosystem.config.js

## Второй вариант запуска

### - `pm2 start` запуск приложения - port 3000 имя STARTAI_DEFAULT

### - `pm2 start STARTAI_ONE_ecosystem.config.js` - запуск приложения - port - 3021 имя STARTAI_ONE

### -` pm2 start STARTAI_TWO_ecosystem.config.js` - запуск приложения - port - 3022 имя STARTAI_TWO

### - `pm2 start STARTAI_THREE_ecosystem.config.js` - запуск приложения - port - 3023 имя STARTAI_THREE

### - `pm2 start STARTAI_FOUR_ecosystem.config.js` - запуск приложения - port - 3024 имя STARTAI_FOUR

### - `pm2 start STARTAI_FIVE_ecosystem.config.js` - запуск приложения - port - 3025 имя STARTAI_FIVE

### - `pm2 start STARTAI_TEST_ecosystem.config.js` - запуск приложения - port - 3026 имя STARTAI_TEST

## Фикс если возникают ошибки с типами в TS или в @oclif/core

### - удалить node_modules в корне, в packages\server, packages\ui, packages\components

### - удалить файлы yarn.lock, package.lock

### - сделать yarn clear cache

### - при ошибки в @oclif/core сделать yarn add @oclif/core@1.26.2

### - yarn install

### - yarn build
