<!-- markdownlint-disable MD030 -->

<p align="center">
<img src="https://github.com/FlowiseAI/Flowise/blob/main/images/flowise_white.svg#gh-light-mode-only">
<img src="https://github.com/FlowiseAI/Flowise/blob/main/images/flowise_dark.svg#gh-dark-mode-only">
</p>

[![发布说明](https://img.shields.io/github/release/FlowiseAI/Flowise)](https://github.com/FlowiseAI/Flowise/releases)
[![Discord](https://img.shields.io/discord/1087698854775881778?label=Discord&logo=discord)](https://discord.gg/jbaHfsRVBW)
[![Twitter关注](https://img.shields.io/twitter/follow/FlowiseAI?style=social)](https://twitter.com/FlowiseAI)
[![GitHub星图](https://img.shields.io/github/stars/FlowiseAI/Flowise?style=social)](https://star-history.com/#FlowiseAI/Flowise)
[![GitHub分支](https://img.shields.io/github/forks/FlowiseAI/Flowise?style=social)](https://github.com/FlowiseAI/Flowise/fork)

[English](../README.md) | [繁體中文](./README-TW.md) | 简体中文 | [日本語](./README-JA.md) | [한국어](./README-KR.md)

<h3>可视化构建 AI 智能体</h3>
<a href="https://github.com/FlowiseAI/Flowise">
<img width="100%" src="https://github.com/FlowiseAI/Flowise/blob/main/images/flowise_agentflow.gif?raw=true"></a>

## ⚡ 快速入门

下载并安装 [NodeJS](https://nodejs.org/en/download) >= 18.15.0

1. 安装 Flowise
    ```bash
    npm install -g flowise
    ```
2. 启动 Flowise

    ```bash
    npx flowise start
    ```

3. 打开 [http://localhost:3000](http://localhost:3000)

## 🐳 Docker

### Docker Compose

1. 克隆 Flowise 项目
2. 进入项目根目录下的 `docker` 文件夹
3. 复制 .env.example 文件，将其粘贴到相同位置，并重命名为 .env 文件
4. 运行 `docker compose up -d`
5. 打开 [http://localhost:3000](http://localhost:3000)
6. 可以通过 `docker compose stop` 停止容器

### Docker 镜像

1. 本地构建镜像：
    ```bash
    docker build --no-cache -t flowise .
    ```
2. 运行镜像：

    ```bash
    docker run -d --name flowise -p 3000:3000 flowise
    ```

3. 停止镜像：
    ```bash
    docker stop flowise
    ```

## 👨‍💻 开发者

Flowise 在一个单一的代码库中有 3 个不同的模块。

-   `server`：用于提供 API 逻辑的 Node 后端
-   `ui`：React 前端
-   `components`：第三方节点集成
-   `api-documentation`：基于 Express 自动生成的 Swagger UI API 文档

### 先决条件

-   安装 [PNPM](https://pnpm.io/installation)
    ```bash
    npm i -g pnpm
    ```

### 设置

1. 克隆仓库

    ```bash
    git clone https://github.com/FlowiseAI/Flowise.git
    ```

2. 进入仓库文件夹

    ```bash
    cd Flowise
    ```

3. 安装所有模块的依赖：

    ```bash
    pnpm install
    ```

4. 构建所有代码：

    ```bash
    pnpm build
    ```

    <details>
    <summary>退出代码 134（JavaScript 堆内存不足）</summary>
    如果在运行上述 `build` 脚本时遇到此错误，请尝试增加 Node.js 的堆内存大小，然后重新运行脚本：

        export NODE_OPTIONS="--max-old-space-size=4096"
        pnpm build

    </details>

5. 启动应用：

    ```bash
    pnpm start
    ```

    现在可以在 [http://localhost:3000](http://localhost:3000) 访问应用

6. 用于开发构建：

    - 在 `packages/ui` 中创建 `.env` 文件并指定 `VITE_PORT`（参考 `.env.example`）
    - 在 `packages/server` 中创建 `.env` 文件并指定 `PORT`（参考 `.env.example`）
    - 运行

        ```bash
        pnpm dev
        ```

    任何代码更改都会自动重新加载应用程序，访问 [http://localhost:8080](http://localhost:8080)

## 🌱 环境变量

Flowise 支持不同的环境变量来配置您的实例。您可以在 `packages/server` 文件夹中的 `.env` 文件中指定以下变量。了解更多信息，请阅读[文档](https://github.com/FlowiseAI/Flowise/blob/main/CONTRIBUTING.md#-env-variables)

## 📖 文档

[Flowise 文档](https://docs.flowiseai.com/)

## 🌐 自托管

在您现有的基础设施中部署自托管的 Flowise，我们支持各种[部署](https://docs.flowiseai.com/configuration/deployment)

-   [AWS](https://docs.flowiseai.com/deployment/aws)
-   [Azure](https://docs.flowiseai.com/deployment/azure)
-   [Digital Ocean](https://docs.flowiseai.com/deployment/digital-ocean)
-   [GCP](https://docs.flowiseai.com/deployment/gcp)
-   <details>
      <summary>其他</summary>

    -   [Railway](https://docs.flowiseai.com/deployment/railway)

        [![在 Railway 上部署](https://railway.app/button.svg)](https://railway.app/template/pn4G8S?referralCode=WVNPD9)

    -   [Render](https://docs.flowiseai.com/deployment/render)

        [![部署到 Render](https://render.com/images/deploy-to-render-button.svg)](https://docs.flowiseai.com/deployment/render)

    -   [HuggingFace Spaces](https://docs.flowiseai.com/deployment/hugging-face)

        <a href="https://huggingface.co/spaces/FlowiseAI/Flowise"><img src="https://huggingface.co/datasets/huggingface/badges/raw/main/open-in-hf-spaces-sm.svg" alt="HuggingFace Spaces"></a>

    -   [Elestio](https://elest.io/open-source/flowiseai)

        [![Deploy on Elestio](https://elest.io/images/logos/deploy-to-elestio-btn.png)](https://elest.io/open-source/flowiseai)

    -   [Sealos](https://template.sealos.io/deploy?templateName=flowise)

        [![部署到 Sealos](https://sealos.io/Deploy-on-Sealos.svg)](https://template.sealos.io/deploy?templateName=flowise)

    -   [RepoCloud](https://repocloud.io/details/?app_id=29)

        [![部署到 RepoCloud](https://d16t0pc4846x52.cloudfront.net/deploy.png)](https://repocloud.io/details/?app_id=29)

      </details>

## ☁️ Flowise 云

[开始使用 Flowise 云](https://flowiseai.com/)

## 🙋 支持

在[讨论区](https://github.com/FlowiseAI/Flowise/discussions)中随时提问、提出问题和请求新功能

## 🙌 贡献

感谢这些了不起的贡献者

<a href="https://github.com/FlowiseAI/Flowise/graphs/contributors">
<img src="https://contrib.rocks/image?repo=FlowiseAI/Flowise" />
</a>

参见[贡献指南](CONTRIBUTING-ZH.md)。如果您有任何问题或问题，请在[Discord](https://discord.gg/jbaHfsRVBW)上与我们联系。

[![Star History Chart](https://api.star-history.com/svg?repos=FlowiseAI/Flowise&type=Timeline)](https://star-history.com/#FlowiseAI/Flowise&Date)

## 📄 许可证

此代码库中的源代码在[Apache License Version 2.0 许可证](../LICENSE.md)下提供。
