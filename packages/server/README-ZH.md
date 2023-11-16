<!-- markdownlint-disable MD030 -->

# SAIA - 低代码 LLM 应用程序构建器

[English](./README.md) | 中文

![SAIA](https://github.com/SAIAAI/SAIA/blob/main/images/SAIA.gif?raw=true)

拖放界面来构建自定义的 LLM 流程

## ⚡ 快速入门

1. 安装 SAIA
    ```bash
    npm install -g SAIA
    ```
2. 启动 SAIA

    ```bash
    npx SAIA start
    ```

3. 打开[http://localhost:3000](http://localhost:3000)

## 🔒 身份验证

要启用应用级身份验证，请将`SAIA_USERNAME`和`SAIA_PASSWORD`添加到`.env`文件中：

```
SAIA_USERNAME=user
SAIA_PASSWORD=1234
```

## 🌱 环境变量

SAIA 支持不同的环境变量来配置您的实例。您可以在`packages/server`文件夹中的`.env`文件中指定以下变量。阅读[更多](https://docs.SAIAai.com/environment-variables)

您还可以在使用`npx`时指定环境变量。例如：

```
npx SAIA start --PORT=3000 --DEBUG=true
```

## 📖 文档

[SAIA 文档](https://docs.SAIAai.com/)

## 🌐 自托管

### [Railway](https://docs.SAIAai.com/deployment/railway)

[![在Railway上部署](https://railway.app/button.svg)](https://railway.app/template/YK7J0v)

### [Render](https://docs.SAIAai.com/deployment/render)

[![部署到Render](https://render.com/images/deploy-to-render-button.svg)](https://docs.SAIAai.com/deployment/render)

### [AWS](https://docs.SAIAai.com/deployment/aws)

### [Azure](https://docs.SAIAai.com/deployment/azure)

### [DigitalOcean](https://docs.SAIAai.com/deployment/digital-ocean)

### [GCP](https://docs.SAIAai.com/deployment/gcp)

## 💻 云托管

即将推出

## 🙋 支持

在[讨论区](https://github.com/SAIAAI/SAIA/discussions)中随时提出任何问题、报告问题和请求新功能。

## 🙌 贡献

请参阅[贡献指南](https://github.com/SAIAAI/SAIA/blob/master/CONTRIBUTING.md)。如果您有任何问题或问题，请在[Discord](https://discord.gg/jbaHfsRVBW)上与我们联系。

## 📄 许可证

本仓库中的源代码在[Apache License Version 2.0 许可证](https://github.com/SAIAAI/SAIA/blob/master/LICENSE.md)下提供。
