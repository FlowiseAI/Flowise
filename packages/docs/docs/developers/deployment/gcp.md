---
description: Learn how to deploy Flowise on GCP
---

# GCP

---

## Prerequisites

1. Notedown your Google Cloud \[ProjectId]
2. Install [Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
3. Install the [Google Cloud CLI](https://cloud.google.com/sdk/docs/install-sdk)
4. Install [Docker Desktop](https://docs.docker.com/desktop/)

## Setup Kubernetes Cluster

1. Create a Kubernetes Cluster if you don't have one.

<figure><img src="/.gitbook/assets/gcp/1.png" alt="" /><figcaption><p>Click `Clusters` to create one.</p></figcaption></figure>

2. Name the Cluster, choose the right resource location, use `Autopilot` mode and keep all other default configs.
3. Once the Cluster is created, Click the 'Connect' menu from the actions menu

<figure><img src="/.gitbook/assets/gcp/2.png" alt="" /><figcaption></figcaption></figure>

4. Copy the command and paste into your terminal and hit enter to connect your cluster.
5. Run the below command and select correct context name, which looks like `gke_[ProjectId]_[DataCenter]_[ClusterName]`

```
kubectl config get-contexts
```

6. Set the current context

```
kubectl config use-context gke_[ProjectId]_[DataCenter]_[ClusterName]
```

## Build and Push the Docker image

Run the following commands to build and push the Docker image to GCP Container Registry.

1. Clone the Flowise

```
git clone https://github.com/FlowiseAI/Flowise.git
```

2. Build the Flowise

```
cd Flowise
pnpm install
pnpm build
```

3. Update the `Dockerfile` file a little.

> Specify the platform of nodejs
>
> ```
> FROM --platform=linux/amd64 node:18-alpine
> ```
>
> Add python3, make and g++ to install
>
> ```
> RUN apk add --no-cache python3 make g++
> ```

3. Build as Docker image, make sure the Docker desktop app is running

```
docker build -t gcr.io/[ProjectId]/flowise:dev .
```

4. Push the Docker image to GCP container registry.

```
docker push gcr.io/[ProjectId]/flowise:dev
```

## Deployment to GCP

1. Create a `yamls` root folder in the project.
2. Add the `deployment.yaml` file into that folder.

```
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: flowise
  labels:
    app: flowise
spec:
  selector:
    matchLabels:
      app: flowise
  replicas: 1
  template:
    metadata:
      labels:
        app: flowise
    spec:
      containers:
      - name: flowise
        image: gcr.io/[ProjectID]/flowise:dev
        imagePullPolicy: Always
        resources:
          requests:
            cpu: "1"
            memory: "1Gi"
```

3. Add the `service.yaml` file into that folder.

```
# service.yaml
apiVersion: "v1"
kind: "Service"
metadata:
  name: "flowise-service"
  namespace: "default"
  labels:
    app: "flowise"
spec:
  ports:
  - protocol: "TCP"
    port: 80
    targetPort: 3000
  selector:
    app: "flowise"
  type: "LoadBalancer"

```

It will be look like below.

<figure><img src="/.gitbook/assets/gcp/3.png" alt="" /><figcaption></figcaption></figure>

4. Deploy the yaml files by running following commands.

```
kubectl apply -f yamls/deployment.yaml
kubectl apply -f yamls/service.yaml
```

5. Go to `Workloads` in the GCP, you can see your pod is running.

<figure><img src="/.gitbook/assets/gcp/4.png" alt="" /><figcaption></figcaption></figure>

6. Go to `Services & Ingress`, you can click the `Endpoint` where the Flowise is hosted.

<figure><img src="/.gitbook/assets/gcp/5.png" alt="" /><figcaption></figcaption></figure>

## Congratulations!

You have successfully hosted the Flowise apps on GCP [🥳](https://emojipedia.org/partying-face/)

## Timeout

By default, there is a 30 seconds timeout assigned to the proxy by GCP. This caused issue when the response is taking longer than 30 seconds threshold to return. In order to fix this issue, make the following changes to YAML files:

Note: To set the timeout to be 10 minutes (for example) -- we specify 600 seconds below.

1. Create a `backendconfig.yaml` file with the following content:

```yaml
apiVersion: cloud.google.com/v1
kind: BackendConfig
metadata:
    name: flowise-backendconfig
    namespace: your-namespace
spec:
    timeoutSec: 600
```

2. Issue: `kubectl apply -f backendconfig.yaml`
3. Update your `service.yaml` file with the following reference to the `BackendConfig`:

```yaml
apiVersion: v1
kind: Service
metadata:
    annotations:
        cloud.google.com/backend-config: '{"default": "flowise-backendconfig"}'
    name: flowise-service
    namespace: your-namespace
```

4. Issue: `kubectl apply -f service.yaml`
