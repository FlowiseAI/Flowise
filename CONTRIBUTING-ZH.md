<!-- markdownlint-disable MD030 -->

# 贡献给 Flowise

[English](./CONTRIBUTING.md) | 中文

我们欢迎任何形式的贡献。

## ⭐ 点赞

点赞并分享[Github 仓库](https://github.com/FlowiseAI/Flowise)。

## 🙋 问题和回答

在[问题和回答](https://github.com/FlowiseAI/Flowise/discussions/categories/q-a)部分搜索任何问题，如果找不到，可以毫不犹豫地创建一个。这可能会帮助到其他有类似问题的人。

## 🙌 分享 Chatflow

是的！分享你如何使用 Flowise 是一种贡献方式。将你的 Chatflow 导出为 JSON，附上截图并在[展示和分享](https://github.com/FlowiseAI/Flowise/discussions/categories/show-and-tell)部分分享。

## 💡 想法

欢迎各种想法，如新功能、应用集成和区块链网络。在[想法](https://github.com/FlowiseAI/Flowise/discussions/categories/ideas)部分提交。

## 🐞 报告错误

发现问题了吗？[报告它](https://github.com/FlowiseAI/Flowise/issues/new/choose)。

## 👨‍💻 贡献代码

不确定要贡献什么？一些想法：

-   从 Langchain 创建新组件
-   更新现有组件，如扩展功能、修复错误
-   添加新的 Chatflow 想法

### 开发人员

Flowise 在一个单一的单体存储库中有 3 个不同的模块。

-   `server`：用于提供 API 逻辑的 Node 后端
-   `ui`：React 前端
-   `components`：Langchain 组件

#### 先决条件

-   安装 [Yarn v1](https://classic.yarnpkg.com/en/docs/install)
    ```bash
    npm i -g yarn
    ```

#### 逐步指南

1. Fork 官方的[Flowise Github 仓库](https://github.com/FlowiseAI/Flowise)。

2. 克隆你 fork 的存储库。

3. 创建一个新的分支，参考[指南](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-and-deleting-branches-within-your-repository)。命名约定：

    - 对于功能分支：`feature/<你的新功能>`
    - 对于 bug 修复分支：`bugfix/<你的新bug修复>`。

4. 切换到新创建的分支。

5. 进入存储库文件夹

    ```bash
    cd Flowise
    ```

6. 安装所有模块的依赖项：

    ```bash
    yarn install
    ```

7. 构建所有代码：

    ```bash
    yarn build
    ```

8. 在[http://localhost:3000](http://localhost:3000)上启动应用程序

    ```bash
    yarn start
    ```

9. 开发时：

    - 在`packages/ui`中创建`.env`文件并指定`PORT`（参考`.env.example`）
    - 在`packages/server`中创建`.env`文件并指定`PORT`（参考`.env.example`）
    - 运行

    ```bash
    yarn dev
    ```

    对`packages/ui`或`packages/server`进行的任何更改都将反映在[http://localhost:8080](http://localhost:8080)上

    对于`packages/components`中进行的更改，再次运行`yarn build`以应用更改。

10. 做完所有的更改后，运行以下命令来确保在生产环境中一切正常：

    ```bash
    yarn build
    ```

    和

    ```bash
    yarn start
    ```

11. 提交代码并从指向 [Flowise 主分支](https://github.com/FlowiseAI/Flowise/tree/master) 的分叉分支上提交 Pull Request。

## 🌱 环境变量

Flowise 支持不同的环境变量来配置您的实例。您可以在 `packages/server` 文件夹中的 `.env` 文件中指定以下变量。阅读[更多信息](https://docs.flowiseai.com/environment-variables)

| 变量名                     | 描述                                                   | 类型                                            | 默认值                              |
| -------------------------- | ------------------------------------------------------ | ----------------------------------------------- | ----------------------------------- |
| PORT                       | Flowise 运行的 HTTP 端口                               | 数字                                            | 3000                                |
| FLOWISE_USERNAME           | 登录用户名                                             | 字符串                                          |                                     |
| FLOWISE_PASSWORD           | 登录密码                                               | 字符串                                          |                                     |
| DEBUG                      | 打印组件的日志                                         | 布尔值                                          |                                     |
| LOG_PATH                   | 存储日志文件的位置                                     | 字符串                                          | `your-path/Flowise/logs`            |
| LOG_LEVEL                  | 日志的不同级别                                         | 枚举字符串: `error`, `info`, `verbose`, `debug` | `info`                              |
| APIKEY_PATH                | 存储 API 密钥的位置                                    | 字符串                                          | `your-path/Flowise/packages/server` |
| TOOL_FUNCTION_BUILTIN_DEP  | 用于工具函数的 NodeJS 内置模块                         | 字符串                                          |                                     |
| TOOL_FUNCTION_EXTERNAL_DEP | 用于工具函数的外部模块                                 | 字符串                                          |                                     |
| OVERRIDE_DATABASE          | 是否使用默认值覆盖当前数据库                           | 枚举字符串: `true`, `false`                     | `true`                              |
| DATABASE_TYPE              | 存储 flowise 数据的数据库类型                          | 枚举字符串: `sqlite`, `mysql`, `postgres`       | `sqlite`                            |
| DATABASE_PATH              | 数据库保存的位置（当 DATABASE_TYPE 是 sqlite 时）      | 字符串                                          | `your-home-dir/.flowise`            |
| DATABASE_HOST              | 主机 URL 或 IP 地址（当 DATABASE_TYPE 不是 sqlite 时） | 字符串                                          |                                     |
| DATABASE_PORT              | 数据库端口（当 DATABASE_TYPE 不是 sqlite 时）          | 字符串                                          |                                     |
| DATABASE_USERNAME          | 数据库用户名（当 DATABASE_TYPE 不是 sqlite 时）        | 字符串                                          |                                     |
| DATABASE_PASSWORD          | 数据库密码（当 DATABASE_TYPE 不是 sqlite 时）          | 字符串                                          |                                     |
| DATABASE_NAME              | 数据库名称（当 DATABASE_TYPE 不是 sqlite 时）          | 字符串                                          |                                     |

您也可以在使用 `npx` 时指定环境变量。例如：

```
npx flowise start --PORT=3000 --DEBUG=true
```

## 📖 贡献文档

[Flowise 文档](https://github.com/FlowiseAI/FlowiseDocs)

## 🏷️ Pull Request 流程

当您打开一个 Pull Request 时，FlowiseAI 团队的成员将自动收到通知/指派。您也可以在 [Discord](https://discord.gg/jbaHfsRVBW) 上联系我们。

##
