<!-- markdownlint-disable MD030 -->

# Contributing to Flowise

English | [中文](./i18n/CONTRIBUTING-ZH.md)

We appreciate any form of contributions.

## ⭐ Star

Star and share the [Github Repo](https://github.com/the-answerai/theanswer).

## 🙋 Q&A

Search up for any questions in [Q&A section](https://github.com/the-answerai/theanswer/discussions/categories/q-a), if you can't find one, don't hesitate to create one. It might helps others that have similar question.

## 🙌 Share Chatflow

Yes! Sharing how you use Flowise is a way of contribution. Export your chatflow as JSON, attach a screenshot and share it in [Show and Tell section](https://github.com/the-answerai/theanswer/discussions/categories/show-and-tell).

## 💡 Ideas

Ideas are welcome such as new feature, apps integration, and blockchain networks. Submit in [Ideas section](https://github.com/the-answerai/theanswer/discussions/categories/ideas).

## 🐞 Report Bugs

Found an issue? [Report it](https://github.com/the-answerai/theanswer/issues/new/choose).

## 👨‍💻 Contribute to Code

Not sure what to contribute? Some ideas:

-   Create new components from `packages/components`
-   Update existing components such as extending functionality, fixing bugs
-   Add new chatflow ideas

### Developers

Flowise has 3 different modules in a single mono repository.

-   `server`: Node backend to serve API logics
-   `ui`: React frontend
-   `components`: Third-party nodes integrations

#### Prerequisite

-   Install [PNPM](https://pnpm.io/installation). The project is configured to use pnpm v9.
    ```bash
    npm i -g pnpm
    ```

#### Git Submodules

This repository uses git submodules to manage external dependencies. Understanding how to work with submodules is crucial for development.

##### Current Submodules

-   **`packages/embed`**: Chat embed functionality from [the-answerai/chat-embed](https://github.com/the-answerai/chat-embed.git)
    -   Branch: `a-main`
    -   Purpose: Provides embeddable chat widgets for external websites

##### Essential Submodule Commands

**Initial Setup:**

```bash
# Clone with submodules (recommended)
git clone --recursive https://github.com/the-answerai/theanswer.git

# Or clone first, then initialize submodules
git clone https://github.com/the-answerai/theanswer.git
cd theanswer
git submodule update --init
```

**Using pnpm scripts (recommended):**
```bash
# Initialize and update submodules
pnpm submodule:init

# Complete reset if having issues
pnpm submodule:reset
```

**Important:** Always run pnpm scripts from the **main repository root** (not from inside submodule directories):
```bash
# ✅ Correct - run from main repo root
cd /path/to/theanswer
pnpm submodule:init

# ❌ Wrong - don't run from inside submodule
cd packages/embed
pnpm submodule:init  # This won't work!
```

**Daily Development:**

```bash
# Check submodule status
git submodule status

# Update all submodules to latest commits
git submodule update --remote

# Update specific submodule
git submodule update --remote packages/embed

# Enter submodule directory and work on it
cd packages/embed
git checkout a-main
git pull origin a-main
```

**When Submodules Change:**

```bash
# After submodule updates, commit the changes in main repo
git add packages/embed
git commit -m "chore: update embed submodule to latest version"

# If you made changes inside the submodule
cd packages/embed
git add .
git commit -m "feat: add new embed feature"
git push origin a-main
cd ../..
git add packages/embed
git commit -m "feat: update embed submodule with new features"
```

##### Common Issues and Solutions

**Issue: Submodule shows as modified but no changes**

```bash
# This usually means the submodule is on a different commit
pnpm submodule:init
# OR
git submodule update --init --recursive
```

**Issue: Can't push because submodule is behind**

```bash
# Update submodule first
pnpm submodule:init
git add packages/embed
git commit -m "chore: update submodule"
git push
```

**Issue: Submodule directory is empty**

```bash
# Re-initialize submodules
pnpm submodule:reset
# OR
git submodule update --init --recursive
```

**Issue: Want to work on submodule code**

```bash
# Enter submodule and create a branch
cd packages/embed
git checkout -b feature/new-embed-feature
# Make changes, commit, push
git push origin feature/new-embed-feature
# Create PR in the submodule repository
```

##### Best Practices

1. **Always check submodule status** before starting work:

    ```bash
    git submodule status
    ```

2. **Update submodules regularly** to avoid conflicts:

    ```bash
    git submodule update --remote
    ```

3. **Commit submodule changes separately** from main repository changes

4. **Use descriptive commit messages** when updating submodules:

    ```bash
    git commit -m "chore: update embed submodule to v3.0.3-23"
    ```

5. **Test after submodule updates** to ensure compatibility

##### Troubleshooting

**Reset submodule to match remote:**

```bash
git submodule update --init --recursive --force
```

**Clean and reinitialize submodules:**

```bash
git submodule deinit -f packages/embed
git submodule update --init --recursive
```

**Check what changed in submodule:**

```bash
git diff packages/embed
```

##### Advanced Troubleshooting

**Issue: Submodule shows as modified but no visible changes**

```bash
# Check if submodule is on the correct commit
git submodule status
# If it shows a different commit than expected, reset it
git submodule update --init --recursive --force
```

**Issue: Can't push because submodule is behind remote**

```bash
# Update submodule to latest
git submodule update --remote packages/embed
# Commit the update
git add packages/embed
git commit -m "chore: update embed submodule"
git push
```

**Issue: Submodule directory is empty or missing files**

```bash
# Remove and reinitialize submodule
git submodule deinit -f packages/embed
git submodule update --init --recursive
```

**Issue: Want to work on submodule code directly**

```bash
# Enter submodule directory
cd packages/embed
# Create a new branch for your changes
git checkout -b feature/your-feature-name
# Make your changes, then commit and push
git add .
git commit -m "feat: your feature description"
git push origin feature/your-feature-name
# Create a pull request in the submodule repository
# After merging, update the main repository
cd ../..
git submodule update --remote packages/embed
git add packages/embed
git commit -m "chore: update embed submodule with new features"
```

**Issue: Submodule is on wrong branch**

```bash
cd packages/embed
git checkout a-main
git pull origin a-main
cd ../..
git add packages/embed
git commit -m "chore: reset embed submodule to correct branch"
```

**Issue: Merge conflicts in submodule**

```bash
# If there are conflicts in the submodule
cd packages/embed
git status  # Check what's conflicted
# Resolve conflicts manually, then
git add .
git commit -m "fix: resolve merge conflicts"
cd ../..
git add packages/embed
git commit -m "chore: update embed submodule after conflict resolution"
```

**Issue: Submodule is detached HEAD**

```bash
cd packages/embed
git checkout a-main
git pull origin a-main
cd ../..
git add packages/embed
git commit -m "chore: fix embed submodule detached HEAD"
```

**Issue: Want to update submodule to a specific commit**

```bash
cd packages/embed
git checkout <specific-commit-hash>
cd ../..
git add packages/embed
git commit -m "chore: update embed submodule to specific commit"
```

**Issue: Submodule changes not reflected in main repo**

```bash
# Check if submodule changes are committed
cd packages/embed
git status
# If there are uncommitted changes, commit them
git add .
git commit -m "feat: your changes"
git push origin a-main
# Then update main repo
cd ../..
git add packages/embed
git commit -m "chore: update embed submodule"
```

**Issue: Want to temporarily disable submodule**

```bash
# Remove submodule from working directory (keeps it in .gitmodules)
git submodule deinit packages/embed
# To restore later
git submodule update --init packages/embed
```

**Issue: Submodule is causing build failures**

```bash
# Check if submodule is on the correct version
git submodule status
# Update to latest stable version
git submodule update --remote packages/embed
git add packages/embed
git commit -m "chore: update embed submodule to fix build issues"
# Test the build
pnpm build
```

**Issue: Changes are being made to submodule instead of main repo**

```bash
# Check which repository you're in
pwd
git remote -v

# If you're in a submodule directory (e.g., packages/embed), navigate back to main repo
cd ../..  # or cd /path/to/main/repo

# Always verify you're in the main repository before making changes
git status
```

**Issue: Terminal/IDE showing wrong repository**

```bash
# Restart your terminal/IDE to refresh git context
# Or manually navigate to the correct directory
cd /path/to/theanswer

# Verify you're in the main repository
git remote -v  # Should show the-answerai/theanswer.git
```

**Issue: VS Code showing changes in both main repo and submodule**

```bash
# VS Code might show changes in both repositories
# Always verify which repository you're committing to:

# Check current repository
git remote -v

# If you see changes in the submodule repository, that's wrong
# Changes should only be in the main repository

# Solution: Close VS Code and reopen from the main repo root
# Or use terminal for git operations to avoid confusion
```

#### Git Workflow and Merge Strategy

To maintain a clean and readable git history, we follow specific merge strategies and commit conventions.

##### Merge Strategy Requirements

**For Pull Requests:**

-   **Always use "Squash and Merge"** when merging pull requests
-   **Never use "Create a merge commit"** as it preserves all intermediate commits
-   **Use "Rebase and merge"** only for simple, single-commit changes

**Why Squash and Merge:**

-   Keeps main branch history clean and linear
-   Combines all feature branch commits into one descriptive commit
-   Makes it easier to understand what changed and when
-   Prevents cluttering the main branch with intermediate commits

##### Commit Message Conventions

**Format:** `type: description`

**Types:**

-   `feat:` - New features
-   `fix:` - Bug fixes
-   `chore:` - Maintenance tasks, dependency updates
-   `docs:` - Documentation changes
-   `style:` - Code style changes (formatting, etc.)
-   `refactor:` - Code refactoring
-   `test:` - Test additions or changes
-   `build:` - Build system changes

**Examples:**

```bash
git commit -m "feat: add new chat embed widget"
git commit -m "fix: resolve CLI command discovery issue"
git commit -m "chore: update embed submodule to v3.0.3-23"
git commit -m "docs: update contributing guidelines"
```

##### Branch Naming Conventions

-   **Feature branches:** `feature/descriptive-name`
-   **Bug fixes:** `bugfix/issue-description`
-   **Hotfixes:** `hotfix/critical-fix`
-   **Documentation:** `docs/update-readme`

##### Pre-commit Checklist

Before committing, ensure:

1. **Submodules are up to date:**

    ```bash
    git submodule status
    git submodule update --remote  # if needed
    ```

2. **Code is properly formatted:**

    ```bash
    pnpm lint
    pnpm format
    ```

3. **Tests pass:**

    ```bash
    pnpm test
    ```

4. **Build succeeds:**
    ```bash
    pnpm build
    ```

##### Handling Submodule Updates in PRs

When updating submodules in a pull request:

1. **Update submodule first:**

    ```bash
    git submodule update --remote packages/embed
    ```

2. **Commit submodule change separately:**

    ```bash
    git add packages/embed
    git commit -m "chore: update embed submodule to latest version"
    ```

3. **Test thoroughly** after submodule updates

4. **Document any breaking changes** in the PR description

##### Avoiding Common Pitfalls

**Don't:**

-   Use regular merge commits (preserves all intermediate commits)
-   Mix submodule updates with feature changes in same commit
-   Forget to test after submodule updates
-   Use generic commit messages like "update" or "fix"

**Do:**

-   Use squash and merge for all PRs
-   Write descriptive commit messages
-   Test thoroughly after any submodule changes
-   Update submodules regularly to avoid large updates

#### Step by step

1. Fork the official [Flowise Github Repository](https://github.com/the-answerai/theanswer).

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
    pnpm install
    ```

7. Build all the code:

    ```bash
    pnpm build
    ```

8. Start the app on [http://localhost:3000](http://localhost:3000)

    ```bash
    pnpm start
    ```

9. For development:

    - Create `.env` file and specify the `VITE_PORT` (refer to `.env.example`) in `packages/ui`
    - Create `.env` file and specify the `PORT` (refer to `.env.example`) in `packages/server`
    - Run

    ```bash
    pnpm dev
    ```

    Any changes made in `packages/ui` or `packages/server` will be reflected on [http://localhost:8080](http://localhost:8080)

    For changes made in `packages/components`, run `pnpm build` again to pickup the changes.

10. After making all the changes, run

    ```bash
    pnpm build
    ```

    and

    ```bash
    pnpm start
    ```

    to make sure everything works fine in production.

11. Commit code and submit Pull Request from forked branch pointing to [Flowise master](https://github.com/the-answerai/theanswer/tree/master).

## 🌱 Env Variables

Flowise support different environment variables to configure your instance. You can specify the following variables in the `.env` file inside `packages/server` folder. Read [more](https://docs.flowiseai.com/environment-variables)

| Variable                           | Description                                                                      | Type                                             | Default                             |
| ---------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------ | ----------------------------------- |
| PORT                               | The HTTP port Flowise runs on                                                    | Number                                           | 3000                                |
| CORS_ORIGINS                       | The allowed origins for all cross-origin HTTP calls                              | String                                           |                                     |
| IFRAME_ORIGINS                     | The allowed origins for iframe src embedding                                     | String                                           |                                     |
| FLOWISE_USERNAME                   | Username to login                                                                | String                                           |                                     |
| FLOWISE_PASSWORD                   | Password to login                                                                | String                                           |                                     |
| FLOWISE_FILE_SIZE_LIMIT            | Upload File Size Limit                                                           | String                                           | 50mb                                |
| DEBUG                              | Print logs from components                                                       | Boolean                                          |                                     |
| LOG_PATH                           | Location where log files are stored                                              | String                                           | `your-path/Flowise/logs`            |
| LOG_LEVEL                          | Different levels of logs                                                         | Enum String: `error`, `info`, `verbose`, `debug` | `info`                              |
| LOG_JSON_SPACES                    | Spaces to beautify JSON logs                                                     |                                                  | 2                                   |
| APIKEY_STORAGE_TYPE                | To store api keys on a JSON file or database. Default is `json`                  | Enum String: `json`, `db`                        | `json`                              |
| APIKEY_PATH                        | Location where api keys are saved when `APIKEY_STORAGE_TYPE` is `json`           | String                                           | `your-path/Flowise/packages/server` |
| TOOL_FUNCTION_BUILTIN_DEP          | NodeJS built-in modules to be used for Tool Function                             | String                                           |                                     |
| TOOL_FUNCTION_EXTERNAL_DEP         | External modules to be used for Tool Function                                    | String                                           |                                     |
| DATABASE_TYPE                      | Type of database to store the flowise data                                       | Enum String: `sqlite`, `mysql`, `postgres`       | `sqlite`                            |
| DATABASE_PATH                      | Location where database is saved (When DATABASE_TYPE is sqlite)                  | String                                           | `your-home-dir/.flowise`            |
| DATABASE_HOST                      | Host URL or IP address (When DATABASE_TYPE is not sqlite)                        | String                                           |                                     |
| DATABASE_PORT                      | Database port (When DATABASE_TYPE is not sqlite)                                 | String                                           |                                     |
| DATABASE_USER                      | Database username (When DATABASE_TYPE is not sqlite)                             | String                                           |                                     |
| DATABASE_PASSWORD                  | Database password (When DATABASE_TYPE is not sqlite)                             | String                                           |                                     |
| DATABASE_NAME                      | Database name (When DATABASE_TYPE is not sqlite)                                 | String                                           |                                     |
| DATABASE_SSL_KEY_BASE64            | Database SSL client cert in base64 (takes priority over DATABASE_SSL)            | Boolean                                          | false                               |
| DATABASE_SSL                       | Database connection overssl (When DATABASE_TYPE is postgre)                      | Boolean                                          | false                               |
| SECRETKEY_PATH                     | Location where encryption key (used to encrypt/decrypt credentials) is saved     | String                                           | `your-path/Flowise/packages/server` |
| FLOWISE_SECRETKEY_OVERWRITE        | Encryption key to be used instead of the key stored in SECRETKEY_PATH            | String                                           |                                     |
| MODEL_LIST_CONFIG_JSON             | File path to load list of models from your local config file                     | String                                           | `/your_model_list_config_file_path` |
| STORAGE_TYPE                       | Type of storage for uploaded files. default is `local`                           | Enum String: `s3`, `local`, `gcs`                | `local`                             |
| BLOB_STORAGE_PATH                  | Local folder path where uploaded files are stored when `STORAGE_TYPE` is `local` | String                                           | `your-home-dir/.flowise/storage`    |
| S3_STORAGE_BUCKET_NAME             | Bucket name to hold the uploaded files when `STORAGE_TYPE` is `s3`               | String                                           |                                     |
| S3_STORAGE_ACCESS_KEY_ID           | AWS Access Key                                                                   | String                                           |                                     |
| S3_STORAGE_SECRET_ACCESS_KEY       | AWS Secret Key                                                                   | String                                           |                                     |
| S3_STORAGE_REGION                  | Region for S3 bucket                                                             | String                                           |                                     |
| S3_ENDPOINT_URL                    | Custom Endpoint for S3                                                           | String                                           |                                     |
| S3_FORCE_PATH_STYLE                | Set this to true to force the request to use path-style addressing               | Boolean                                          | false                               |
| GOOGLE_CLOUD_STORAGE_PROJ_ID       | The GCP project id for cloud storage & logging when `STORAGE_TYPE` is `gcs`      | String                                           |                                     |
| GOOGLE_CLOUD_STORAGE_CREDENTIAL    | The credential key file path when `STORAGE_TYPE` is `gcs`                        | String                                           |                                     |
| GOOGLE_CLOUD_STORAGE_BUCKET_NAME   | Bucket name to hold the uploaded files when `STORAGE_TYPE` is `gcs`              | String                                           |                                     |
| GOOGLE_CLOUD_UNIFORM_BUCKET_ACCESS | Enable uniform bucket level access when `STORAGE_TYPE` is `gcs`                  | Boolean                                          | true                                |
| SHOW_COMMUNITY_NODES               | Show nodes created by community                                                  | Boolean                                          |                                     |
| DISABLED_NODES                     | Hide nodes from UI (comma separated list of node names)                          | String                                           |                                     |

You can also specify the env variables when using `npx`. For example:

```
npx flowise start --PORT=3000 --DEBUG=true
```

## 📖 Contribute to Docs

[Flowise Docs](https://github.com/the-answerai/theanswerDocs)

## 🏷️ Pull Request process

A member of the FlowiseAI team will automatically be notified/assigned when you open a pull request. You can also reach out to us on [Discord](https://discord.gg/jbaHfsRVBW).

## 📜 Code of Conduct

This project and everyone participating in it are governed by the Code of Conduct which can be found in the [file](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to hello@flowiseai.com.
