<!-- markdownlint-disable MD030 -->

# Flowise

[English](./README.md) | 中文

<h3>以可视化方式构建 AI Agents</h3>

![Flowise](https://github.com/FlowiseAI/Flowise/blob/main/images/flowise_agentflow.gif?raw=true)

## ⚡ 快速入门

1. 安装 Flowise
    ```bash
    npm install -g flowise
    ```
2. 启动 Flowise

    ```bash
    npx flowise start
    ```

3. 打开[http://localhost:3000](http://localhost:3000)

## 🌱 环境变量

Flowise 支持不同的环境变量来配置您的实例。您可以在`packages/server`文件夹中的`.env`文件中指定以下变量。阅读[更多](https://docs.flowiseai.com/environment-variables)

您还可以在使用`npx`时指定环境变量。例如：

```
npx flowise start --PORT=3000 --DEBUG=true
```

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

    -   [HuggingFace Spaces](https://docs.flowiseai.com/configuration/deployment/hugging-face)

        <a href="https://huggingface.co/spaces/FlowiseAI/Flowise"><img src="https://huggingface.co/datasets/huggingface/badges/raw/main/open-in-hf-spaces-sm.svg" alt="HuggingFace Spaces"></a>

    -   [Elestio](https://elest.io/open-source/flowiseai)

        [![Deploy](https://pub-da36157c854648669813f3f76c526c2b.r2.dev/deploy-on-elestio-black.png)](https://elest.io/open-source/flowiseai)

    -   [Sealos](https://cloud.sealos.io/?openapp=system-template%3FtemplateName%3Dflowise)

        [![部署到 Sealos](https://raw.githubusercontent.com/labring-actions/templates/main/Deploy-on-Sealos.svg)](https://cloud.sealos.io/?openapp=system-template%3FtemplateName%3Dflowise)

    -   [RepoCloud](https://repocloud.io/details/?app_id=29)

        [![部署到 RepoCloud](https://d16t0pc4846x52.cloudfront.net/deploy.png)](https://repocloud.io/details/?app_id=29)

      </details>

## ☁️ 云托管

[开始使用云托管](https://flowiseai.com/)

## 🙋 支持

在[讨论区](https://github.com/FlowiseAI/Flowise/discussions)中随时提出任何问题、报告问题和请求新功能。

## 🙌 贡献

请参阅[贡献指南](https://github.com/FlowiseAI/Flowise/blob/master/CONTRIBUTING.md)。如果您有任何问题或问题，请在[Discord](https://discord.gg/jbaHfsRVBW)上与我们联系。

## 📄 许可证

本仓库中的源代码在[Apache License Version 2.0 许可证](https://github.com/FlowiseAI/Flowise/blob/master/LICENSE.md)下提供。
