<!-- markdownlint-disable MD030 -->

# Contributing to Flowise

We appreciate any form of contributions.

## ⭐ Star

Star and share the [Github Repo](https://github.com/FlowiseAI/Flowise).

## 🙋 Q&A

Search up for any questions in [Q&A section](https://github.com/FlowiseAI/Flowise/discussions/categories/q-a), if you can't find one, don't hesitate to create one. It might helps others that have similar question.

## 🙌 Share Chatflow

Yes! Sharing how you use Flowise is a way of contribution. Export your chatflow as JSON, attach a screenshot and share it in [Show and Tell section](https://github.com/FlowiseAI/Flowise/discussions/categories/show-and-tell).

## 💡 Ideas

Ideas are welcome such as new feature, apps integration, and blockchain networks. Submit in [Ideas section](https://github.com/FlowiseAI/Flowise/discussions/categories/ideas).

## 🐞 Report Bugs

Found an issue? [Report it](https://github.com/FlowiseAI/Flowise/issues/new/choose).

## 👨‍💻 Contribute to Code

Not sure what to contribute? Some ideas:

-   Create new components from Langchain
-   Update existing components such as extending functionality, fixing bugs
-   Add new chatflow ideas

### Developers

Flowise has 3 different modules in a single mono repository.

-   `server`: Node backend to serve API logics
-   `ui`: React frontend
-   `components`: Langchain components

#### Prerequisite

-   Install Yarn
    ```bash
    npm i -g yarn
    ```

#### Step by step

1. Fork the official [Flowise Github Repository](https://github.com/FlowiseAI/Flowise).

2. Clone your forked repository.

3. Create a new branch, see [guide](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-and-deleting-branches-within-your-repository). Naming conventions:

    - For feature branch: `feature/<Your New Feature>`
    - For bug fix branch: `bugfix/<Your New Bugfix>`.

4. Switch to the newly created branch.

5. Go into repository folder

    ```bash
    cd Flowise
    ```

6. Install all dependencies of all modules:

    ```bash
    yarn install
    ```

7. Build all the code:

    ```bash
    yarn build
    ```

8. Start the app on [http://localhost:3000](http://localhost:3000)

    ```bash
    yarn start
    ```

9. For development, run

    ```bash
    yarn dev
    ```

    Any changes made in `packages/ui` or `packages/server` will be reflected on [http://localhost:8080](http://localhost:8080)

    For changes made in `packages/components`, run `yarn build` again to pickup the changes.

10. After making all the changes, run

    ```bash
    yarn build
    ```

    and

    ```bash
    yarn start
    ```

    to make sure everything works fine in production.

11. Commit code and submit Pull Request from forked branch pointing to [Flowise master](https://github.com/FlowiseAI/Flowise/tree/master).

## 📖 Contribute to Docs

In-Progress

## 🏷️ Pull Request process

A member of the FlowiseAI team will automatically be notified/assigned when you open a pull request. You can also reach out to us on [Discord](https://discord.gg/7C5xTWP8).

## 📃 Contributor License Agreement

Before we can merge your contribution you have to sign our [Contributor License Agreement (CLA)](https://cla-assistant.io/FlowiseAI/Flowise). The CLA contains the terms and conditions under which the contribution is submitted. You need to do this only once for your first pull request. Keep in mind that without a signed CLA we cannot merge your contribution.

## 📜 Code of Conduct

This project and everyone participating in it are governed by the Code of Conduct which can be found in the [file](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to hello@flowiseai.com.
