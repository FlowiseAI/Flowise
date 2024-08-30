---
description: Learn how to set up app-level access control for your Flowise instances
---

# App Level

---

App level authorization protects your Flowise instance by username and password. This protects your apps from being accessible by anyone when deployed online.

<figure><img src="/.gitbook/assets/image (2) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1).png" alt="" /><figcaption></figcaption></figure>

## How to Set Username & Password

### Npm

1. Install Flowise

```bash
npm install -g flowise
```

2. Start Flowise with username & password

```bash
npx flowise start --FLOWISE_USERNAME=user --FLOWISE_PASSWORD=1234
```

3. Open [http://localhost:3000](http://localhost:3000)

### Docker

1. Navigate to `docker` folder

```
cd docker
```

2. Create `.env` file and specify the `PORT`, `FLOWISE_USERNAME`, and `FLOWISE_PASSWORD`

```sh
PORT=3000
FLOWISE_USERNAME=user
FLOWISE_PASSWORD=1234
```

3. Pass `FLOWISE_USERNAME` and `FLOWISE_PASSWORD` to the `docker-compose.yml` file:

```
environment:
    - PORT=${PORT}
    - FLOWISE_USERNAME=${FLOWISE_USERNAME}
    - FLOWISE_PASSWORD=${FLOWISE_PASSWORD}
```

4. `docker compose up -d`
5. Open [http://localhost:3000](http://localhost:3000)
6. You can bring the containers down by `docker compose stop`

### Git clone

To enable app level authentication, add `FLOWISE_USERNAME` and `FLOWISE_PASSWORD` to the `.env` file in `packages/server`:

```
FLOWISE_USERNAME=user
FLOWISE_PASSWORD=1234
```
