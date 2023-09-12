<!-- markdownlint-disable MD030 -->

# Flowise - 低代码 LLM 应用程序构建器

[English](./README.md) | 中文

![Flowise](https://github.com/FlowiseAI/Flowise/blob/main/images/flowise.gif?raw=true)

拖放界面来构建自定义的 LLM 流程

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

## 🔒 身份验证

要启用应用级身份验证，请将`FLOWISE_USERNAME`和`FLOWISE_PASSWORD`添加到`.env`文件中：

```
FLOWISE_USERNAME=user
FLOWISE_PASSWORD=1234
```

## 🌱 环境变量

Flowise 支持不同的环境变量来配置您的实例。您可以在`packages/server`文件夹中的`.env`文件中指定以下变量。阅读[更多](https://docs.flowiseai.com/environment-variables)

| 变量                       | 描述                                                   | 类型                                            | 默认值                              |
| -------------------------- | ------------------------------------------------------ | ----------------------------------------------- | ----------------------------------- |
| PORT                       | Flowise 运行的 HTTP 端口                               | 数字                                            | 3000                                |
| FLOWISE_USERNAME           | 登录的用户名                                           | 字符串                                          |                                     |
| FLOWISE_PASSWORD           | 登录的密码                                             | 字符串                                          |                                     |
| DEBUG                      | 打印组件的日志                                         | 布尔值                                          |                                     |
| LOG_PATH                   | 存储日志文件的位置                                     | 字符串                                          | `your-path/Flowise/logs`            |
| LOG_LEVEL                  | 日志的不同级别                                         | 枚举字符串：`error`、`info`、`verbose`、`debug` | `info`                              |
| APIKEY_PATH                | 存储 API 密钥的位置                                    | 字符串                                          | `your-path/Flowise/packages/server` |
| TOOL_FUNCTION_BUILTIN_DEP  | 用于工具函数的 NodeJS 内置模块                         | 字符串                                          |                                     |
| TOOL_FUNCTION_EXTERNAL_DEP | 用于工具函数的外部模块                                 | 字符串                                          |                                     |
| OVERRIDE_DATABASE          | 使用默认值覆盖当前数据库                               | 枚举字符串：`true`、`false`                     | `true`                              |
| DATABASE_TYPE              | 存储 flowise 数据的数据库类型                          | 枚举字符串：`sqlite`、`mysql`、`postgres`       | `sqlite`                            |
| DATABASE_PATH              | 数据库的保存位置（当 DATABASE_TYPE 为 sqlite 时）      | 字符串                                          | `your-home-dir/.flowise`            |
| DATABASE_HOST              | 主机 URL 或 IP 地址（当 DATABASE_TYPE 不为 sqlite 时） | 字符串                                          |                                     |
| DATABASE_PORT              | 数据库端口（当 DATABASE_TYPE 不为 sqlite 时）          | 字符串                                          |                                     |
| DATABASE_USERNAME          | 数据库用户名（当 DATABASE_TYPE 不为 sqlite 时）        | 字符串                                          |                                     |
| DATABASE_PASSWORD          | 数据库密码（当 DATABASE_TYPE 不为 sqlite 时）          | 字符串                                          |                                     |
| DATABASE_NAME              | 数据库名称（当 DATABASE_TYPE 不为 sqlite 时）          | 字符串                                          |                                     |

您还可以在使用`npx`时指定环境变量。例如：

```
npx flowise start --PORT=3000 --DEBUG=true
```

## 📖 文档

[Flowise 文档](https://docs.flowiseai.com/)

## 🌐 自托管

### [Railway](https://docs.flowiseai.com/deployment/railway)

[![在Railway上部署](https://railway.app/button.svg)](https://railway.app/template/YK7J0v)

### [Render](https://docs.flowiseai.com/deployment/render)

[![部署到Render](https://render.com/images/deploy-to-render-button.svg)](https://docs.flowiseai.com/deployment/render)

### [AWS](https://docs.flowiseai.com/deployment/aws)

### [Azure](https://docs.flowiseai.com/deployment/azure)

### [DigitalOcean](https://docs.flowiseai.com/deployment/digital-ocean)

### [GCP](https://docs.flowiseai.com/deployment/gcp)

## 💻 云托管

即将推出

## 🙋 支持

在[讨论区](https://github.com/FlowiseAI/Flowise/discussions)中随时提出任何问题、报告问题和请求新功能。

## 🙌 贡献

请参阅[贡献指南](https://github.com/FlowiseAI/Flowise/blob/master/CONTRIBUTING.md)。如果您有任何问题或问题，请在[Discord](https://discord.gg/jbaHfsRVBW)上与我们联系。

## 📄 许可证

本仓库中的源代码在[Apache License Version 2.0 许可证](https://github.com/FlowiseAI/Flowise/blob/master/LICENSE.md)下提供。
