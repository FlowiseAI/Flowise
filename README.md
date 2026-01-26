<!-- markdownlint-disable MD030 -->

<p align="center">
<img src="https://github.com/FlowiseAI/Flowise/blob/main/images/flowise_white.svg#gh-light-mode-only">
<img src="https://github.com/FlowiseAI/Flowise/blob/main/images/flowise_dark.svg#gh-dark-mode-only">
</p>

<div align="center">

[![Release Notes](https://img.shields.io/github/release/FlowiseAI/Flowise)](https://github.com/FlowiseAI/Flowise/releases)
[![Discord](https://img.shields.io/discord/1087698854775881778?label=Discord&logo=discord)](https://discord.gg/jbaHfsRVBW)
[![Twitter Follow](https://img.shields.io/twitter/follow/FlowiseAI?style=social)](https://twitter.com/FlowiseAI)
[![GitHub star chart](https://img.shields.io/github/stars/FlowiseAI/Flowise?style=social)](https://star-history.com/#FlowiseAI/Flowise)
[![GitHub fork](https://img.shields.io/github/forks/FlowiseAI/Flowise?style=social)](https://github.com/FlowiseAI/Flowise/fork)

English | [繁體中文](./i18n/README-TW.md) | [简体中文](./i18n/README-ZH.md) | [日本語](./i18n/README-JA.md) | [한국어](./i18n/README-KR.md)

</div>

<h3>Build AI Agents, Visually</h3>
<a href="https://github.com/FlowiseAI/Flowise">
<img width="100%" src="https://github.com/FlowiseAI/Flowise/blob/main/images/flowise_agentflow.gif?raw=true"></a>

## 📚 Table of Contents

-   [⚡ Quick Start](#-quick-start)
    -   [Troubleshooting: Node.js Version](#troubleshooting-nodejs-version)
-   [🐳 Docker](#-docker)
-   [👨‍💻 Developers](#-developers)
-   [🌱 Env Variables](#-env-variables)
-   [📖 Documentation](#-documentation)
-   [🌐 Self Host](#-self-host)
-   [☁️ Flowise Cloud](#️-flowise-cloud)
-   [🙋 Support](#-support)
-   [🙌 Contributing](#-contributing)
-   [📄 License](#-license)

## ⚡Quick Start

Download and Install [NodeJS](https://nodejs.org/en/download) >= 20.0.0

1. Install Flowise
    ```bash
    npm install -g flowise
    ```
2. Start Flowise

    ```bash
    npx flowise start
    ```

3. Open [http://localhost:3000](http://localhost:3000)

### Troubleshooting: Node.js Version

If you encounter `ReferenceError: File is not defined` or similar errors, your Node.js version is likely below v20.

<details>
<summary>Upgrade Node.js using NVM (Recommended)</summary>

1. **Install NVM (Node Version Manager)**:
    ```bash
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    source ~/.bashrc
    ```

2. **Install and use Node.js v20**:
    ```bash
    nvm install 20
    nvm use 20
    nvm alias default 20
    ```

3. **Verify installation**:
    ```bash
    node -v
    # should show v20.x.x
    ```

4. **Reinstall Flowise**:
    ```bash
    npm install -g flowise
    ```

</details>

<details>
<summary>Alternative: Install via NodeSource (APT)</summary>

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

</details>

<details>
<summary>Clean Up Old Node.js Versions (Linux)</summary>

After upgrading via NVM, remove any system-installed Node.js to avoid conflicts:

```bash
sudo apt-get remove --purge nodejs npm
sudo apt-get autoremove
```

Verify NVM's Node is active:
```bash
which node
# Should show: ~/.nvm/versions/node/v20.x.x/bin/node
```

</details>

<details>
<summary>Run Flowise as a Background Service</summary>

#### Option A: Using pm2 (Recommended)

`pm2` is a process manager for Node.js that keeps apps alive and restarts them on failure.

1. **Install pm2**:
    ```bash
    npm install -g pm2
    ```

2. **Start Flowise**:
    ```bash
    pm2 start "npx flowise start" --name flowise
    ```

3. **Enable auto-start on reboot**:
    ```bash
    pm2 save
    pm2 startup
    ```
    Follow the printed instructions (usually a `sudo` command).

4. **Useful commands**:
    ```bash
    pm2 list          # Check status
    pm2 logs flowise  # View logs
    pm2 restart flowise
    pm2 stop flowise
    ```

#### Option B: Using systemd (Native Linux)

1. **Create a systemd service file**:
    ```bash
    sudo nano /etc/systemd/system/flowise.service
    ```

2. **Add the following** (replace `YOUR_USERNAME` with your actual username):
    ```ini
    [Unit]
    Description=Flowise AI Service
    After=network.target

    [Service]
    Type=simple
    User=YOUR_USERNAME
    WorkingDirectory=/home/YOUR_USERNAME
    ExecStart=/bin/bash -c 'export NVM_DIR="/home/YOUR_USERNAME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && npx flowise start'
    Restart=always
    RestartSec=10

    [Install]
    WantedBy=multi-user.target
    ```

3. **Enable and start the service**:
    ```bash
    sudo systemctl daemon-reload
    sudo systemctl enable flowise
    sudo systemctl start flowise
    ```

4. **Check status**:
    ```bash
    sudo systemctl status flowise
    ```

</details>

<details>
<summary>Nginx Reverse Proxy Setup</summary>

Set up Nginx to access Flowise via a custom domain (e.g., `http://flowise.local`).

1. **Install Nginx**:
    ```bash
    sudo apt update && sudo apt install nginx -y
    ```

2. **Create server block**:
    ```bash
    sudo nano /etc/nginx/sites-available/flowise
    ```
    
    Add:
    ```nginx
    server {
        listen 80;
        server_name flowise.local;

        location / {
            proxy_pass http://localhost:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
    ```

3. **For local testing**, add to `/etc/hosts`:
    ```bash
    echo "127.0.0.1 flowise.local" | sudo tee -a /etc/hosts
    ```

4. **Enable and reload**:
    ```bash
    sudo ln -s /etc/nginx/sites-available/flowise /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl reload nginx
    ```

5. **Access**: Open `http://flowise.local`

#### Enable HTTPS with Let's Encrypt

For production with a real domain:
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d flowise.example.com
```

Verify auto-renewal:
```bash
sudo certbot renew --dry-run
```

#### Add Basic Authentication

1. **Create password file**:
    ```bash
    sudo apt install apache2-utils -y
    sudo htpasswd -c /etc/nginx/.htpasswd your_username
    ```

2. **Update Nginx config** — add inside `location / { }`:
    ```nginx
    auth_basic "Restricted Access";
    auth_basic_user_file /etc/nginx/.htpasswd;
    ```

3. **Reload**:
    ```bash
    sudo nginx -t && sudo systemctl reload nginx
    ```

#### Flowise Built-in Authentication

Alternatively, use Flowise's native auth by setting environment variables:
```bash
# In your .env file or service config
FLOWISE_USERNAME=admin
FLOWISE_PASSWORD=your_secure_password
```

</details>

## 🐳 Docker

### Docker Compose

1. Clone the Flowise project
2. Go to `docker` folder at the root of the project
3. Copy `.env.example` file, paste it into the same location, and rename to `.env` file
4. `docker compose up -d`
5. Open [http://localhost:3000](http://localhost:3000)
6. You can bring the containers down by `docker compose stop`

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
-   `api-documentation`: Auto-generated swagger-ui API docs from express

### Prerequisite

-   Install [PNPM](https://pnpm.io/installation)
    ```bash
    npm i -g pnpm
    ```

### Setup

1.  Clone the repository:

    ```bash
    git clone https://github.com/FlowiseAI/Flowise.git
    ```

2.  Go into repository folder:

    ```bash
    cd Flowise
    ```

3.  Install all dependencies of all modules:

    ```bash
    pnpm install
    ```

4.  Build all the code:

    ```bash
    pnpm build
    ```

    <details>
    <summary>Exit code 134 (JavaScript heap out of memory)</summary>  
    If you get this error when running the above `build` script, try increasing the Node.js heap size and run the script again:

    ```bash
    # macOS / Linux / Git Bash
    export NODE_OPTIONS="--max-old-space-size=4096"

    # Windows PowerShell
    $env:NODE_OPTIONS="--max-old-space-size=4096"

    # Windows CMD
    set NODE_OPTIONS=--max-old-space-size=4096
    ```

    Then run:

    ```bash
    pnpm build
    ```

    </details>

5.  Start the app:

    ```bash
    pnpm start
    ```

    You can now access the app on [http://localhost:3000](http://localhost:3000)

6.  For development build:

    -   Create `.env` file and specify the `VITE_PORT` (refer to `.env.example`) in `packages/ui`
    -   Create `.env` file and specify the `PORT` (refer to `.env.example`) in `packages/server`
    -   Run:

        ```bash
        pnpm dev
        ```

    Any code changes will reload the app automatically on [http://localhost:8080](http://localhost:8080)

## 🌱 Env Variables

Flowise supports different environment variables to configure your instance. You can specify the following variables in the `.env` file inside `packages/server` folder. Read [more](https://github.com/FlowiseAI/Flowise/blob/main/CONTRIBUTING.md#-env-variables)

## 📖 Documentation

You can view the Flowise Docs [here](https://docs.flowiseai.com/)

## 🌐 Self Host

Deploy Flowise self-hosted in your existing infrastructure, we support various [deployments](https://docs.flowiseai.com/configuration/deployment)

-   [AWS](https://docs.flowiseai.com/configuration/deployment/aws)
-   [Azure](https://docs.flowiseai.com/configuration/deployment/azure)
-   [Digital Ocean](https://docs.flowiseai.com/configuration/deployment/digital-ocean)
-   [GCP](https://docs.flowiseai.com/configuration/deployment/gcp)
-   [Alibaba Cloud](https://computenest.console.aliyun.com/service/instance/create/default?type=user&ServiceName=Flowise社区版)
-   <details>
      <summary>Others</summary>

    -   [Railway](https://docs.flowiseai.com/configuration/deployment/railway)

        [![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/pn4G8S?referralCode=WVNPD9)

    -   [Northflank](https://northflank.com/stacks/deploy-flowiseai)

        [![Deploy to Northflank](https://assets.northflank.com/deploy_to_northflank_smm_36700fb050.svg)](https://northflank.com/stacks/deploy-flowiseai)

    -   [Render](https://docs.flowiseai.com/configuration/deployment/render)

        [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://docs.flowiseai.com/configuration/deployment/render)

    -   [HuggingFace Spaces](https://docs.flowiseai.com/deployment/hugging-face)

        <a href="https://huggingface.co/spaces/FlowiseAI/Flowise"><img src="https://huggingface.co/datasets/huggingface/badges/raw/main/open-in-hf-spaces-sm.svg" alt="HuggingFace Spaces"></a>

    -   [Elestio](https://elest.io/open-source/flowiseai)

        [![Deploy on Elestio](https://elest.io/images/logos/deploy-to-elestio-btn.png)](https://elest.io/open-source/flowiseai)

    -   [Sealos](https://template.sealos.io/deploy?templateName=flowise)

        [![Deploy on Sealos](https://sealos.io/Deploy-on-Sealos.svg)](https://template.sealos.io/deploy?templateName=flowise)

    -   [RepoCloud](https://repocloud.io/details/?app_id=29)

        [![Deploy on RepoCloud](https://d16t0pc4846x52.cloudfront.net/deploy.png)](https://repocloud.io/details/?app_id=29)

      </details>

## ☁️ Flowise Cloud

Get Started with [Flowise Cloud](https://flowiseai.com/).

## 🙋 Support

Feel free to ask any questions, raise problems, and request new features in [Discussion](https://github.com/FlowiseAI/Flowise/discussions).

## 🙌 Contributing

Thanks go to these awesome contributors

<a href="https://github.com/FlowiseAI/Flowise/graphs/contributors">
<img src="https://contrib.rocks/image?repo=FlowiseAI/Flowise" />
</a><br><br>

See [Contributing Guide](CONTRIBUTING.md). Reach out to us at [Discord](https://discord.gg/jbaHfsRVBW) if you have any questions or issues.

[![Star History Chart](https://api.star-history.com/svg?repos=FlowiseAI/Flowise&type=Timeline)](https://star-history.com/#FlowiseAI/Flowise&Date)

## 📄 License

Source code in this repository is made available under the [Apache License Version 2.0](LICENSE.md).
