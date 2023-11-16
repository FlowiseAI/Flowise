<!-- markdownlint-disable MD030 -->

# SAIA - Low-Code LLM apps builder

English | [中文](./README-ZH.md)

![SAIA](https://github.com/SAIAAI/SAIA/blob/main/images/SAIA.gif?raw=true)

Drag & drop UI to build your customized LLM flow

## ⚡Quick Start

1. Install SAIA
    ```bash
    npm install -g SAIA
    ```
2. Start SAIA

    ```bash
    npx SAIA start
    ```

3. Open [http://localhost:3000](http://localhost:3000)

## 🔒 Authentication

To enable app level authentication, add `SAIA_USERNAME` and `SAIA_PASSWORD` to the `.env` file:

```
SAIA_USERNAME=user
SAIA_PASSWORD=1234
```

## 🌱 Env Variables

SAIA support different environment variables to configure your instance. You can specify the following variables in the `.env` file inside `packages/server` folder. Read [more](https://github.com/SAIAAI/SAIA/blob/main/CONTRIBUTING.md#-env-variables)

You can also specify the env variables when using `npx`. For example:

```
npx SAIA start --PORT=3000 --DEBUG=true
```

## 📖 Documentation

[SAIA Docs](https://docs.SAIAai.com/)

## 🌐 Self Host

### [Railway](https://docs.SAIAai.com/deployment/railway)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/YK7J0v)

### [Render](https://docs.SAIAai.com/deployment/render)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://docs.SAIAai.com/deployment/render)

### [AWS](https://docs.SAIAai.com/deployment/aws)

### [Azure](https://docs.SAIAai.com/deployment/azure)

### [DigitalOcean](https://docs.SAIAai.com/deployment/digital-ocean)

### [GCP](https://docs.SAIAai.com/deployment/gcp)

## 💻 Cloud Hosted

Coming Soon

## 🙋 Support

Feel free to ask any questions, raise problems, and request new features in [discussion](https://github.com/SAIAAI/SAIA/discussions)

## 🙌 Contributing

See [contributing guide](https://github.com/SAIAAI/SAIA/blob/master/CONTRIBUTING.md). Reach out to us at [Discord](https://discord.gg/jbaHfsRVBW) if you have any questions or issues.

## 📄 License

Source code in this repository is made available under the [Apache License Version 2.0](https://github.com/SAIAAI/SAIA/blob/master/LICENSE.md).
