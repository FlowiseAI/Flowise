---
description: Learn how to deploy AnswerAgentAI on Azure using Terraform and Azure Container Instances
---

# Azure

## Overview

This guide covers two methods for deploying AnswerAgentAI on Azure:

1. Using Terraform to deploy AnswerAgentAI as an Azure App Service with Postgres
2. Using Azure Container Instances (ACI) through the Azure Portal UI or Azure CLI

## Method 1: AnswerAgentAI as Azure App Service with Postgres Using Terraform

### Prerequisites

1. **Azure Account**: Ensure you have an Azure account with an active subscription. If you don't have one, sign up at [Azure Portal](https://portal.azure.com/).
2. **Terraform**: Install Terraform CLI on your machine. Download it from [Terraform's website](https://www.terraform.io/downloads.html).
3. **Azure CLI**: Install Azure CLI. Instructions can be found on the [Azure CLI documentation page](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli).

### Setting Up Your Environment

1. **Login to Azure**: Open your terminal or command prompt and login to Azure CLI:

```bash
az login --tenant <Your Subscription ID> --use-device-code
```

2. **Set Subscription**:

```bash
az account set --subscription <Your Subscription ID>
```

3. **Initialize Terraform**:

Create a `terraform.tfvars` file in your Terraform project directory with the following content:

```hcl
subscription_name = "subscription_name"
subscription_id = "subscription id"
project_name = "webapp_name"
db_username = "PostgresUserName"
db_password = "strongPostgresPassword"
flowise_username = "flowiseUserName"
flowise_password = "strongFlowisePassword"
flowise_secretkey_overwrite = "longandStrongSecretKey"
webapp_ip_rules = [
  {
    name = "AllowedIP"
    ip_address = "X.X.X.X/32"
    headers = null
    virtual_network_subnet_id = null
    subnet_id = null
    service_tag = null
    priority = 300
    action = "Allow"
  }
]
postgres_ip_rules = {
  "ValbyOfficeIP" = "X.X.X.X"
}
source_image = "flowiseai/flowise:latest"
tagged_image = "flow:v1"
```

Replace the placeholders with your actual values.

4. **Initialize Terraform**:

Navigate to your Terraform project directory and run:

```bash
terraform init
```

### Deploying with Terraform

1. **Plan the Deployment**:

```bash
terraform plan
```

2. **Apply the Deployment**:

```bash
terraform apply
```

3. **Verify the Deployment**: Once Terraform has completed, check the Azure Portal to verify that the resources are correctly deployed.

## Method 2: Azure Container Instance

### Prerequisites

1. _(Optional)_ [Install Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) if you'd like to use CLI commands

### Option A: Create a Container Instance without Persistent Storage

#### Using Azure Portal

1. Search for Container Instances in Marketplace and click Create.
2. Configure basic settings:
    - Select or create a Resource group
    - Set Container name, Region, Image source (Other registry)
    - Set Image to `flowiseai/flowise`
    - Choose OS type and Size
3. Configure networking:
    - Add port `3000 (TCP)` in addition to the default `80 (TCP)`
4. Configure advanced settings:
    - Set Restart policy to `On failure`
    - Add Environment variables: `FLOWISE_USERNAME` and `FLOWISE_PASSWORD`
    - Set Command override to `["/bin/sh", "-c", "flowise start"]`
5. Review and create the container instance.

<!-- TODO: Add a screenshot of the successful deployment in Azure Portal -->

#### Using Azure CLI

1. Create a resource group:

```bash
az group create --name flowise-rg --location "West US"
```

2. Create a Container Instance:

```bash
az container create -g flowise-rg \
    --name flowise \
    --image flowiseai/flowise \
    --command-line "/bin/sh -c 'flowise start'" \
    --environment-variables FLOWISE_USERNAME=flowise-user FLOWISE_PASSWORD=flowise-password \
    --ip-address public \
    --ports 80 3000 \
    --restart-policy OnFailure
```

3. Access AnswerAgentAI at the IP address (including port :3000) provided in the output.

### Option B: Create a Container Instance with Persistent Storage

This option is only possible using Azure CLI:

1. Create a resource group:

```bash
az group create --name flowise-rg --location "West US"
```

2. Create a Storage Account and File share. Refer to [Azure documentation](https://learn.microsoft.com/en-us/azure/storage/files/storage-how-to-use-files-portal?tabs=azure-portal) for detailed steps.

3. Create a Container Instance with persistent storage:

```bash
az container create -g flowise-rg \
    --name flowise \
    --image flowiseai/flowise \
    --command-line "/bin/sh -c 'flowise start'" \
    --environment-variables FLOWISE_USERNAME=flowise-user FLOWISE_PASSWORD=flowise-password DATABASE_PATH=/opt/flowise/.flowise APIKEY_PATH=/opt/flowise/.flowise SECRETKEY_PATH=/opt/flowise/.flowise LOG_PATH=/opt/flowise/.flowise/logs BLOB_STORAGE_PATH=/opt/flowise/.flowise/storage \
    --ip-address public \
    --ports 80 3000 \
    --restart-policy OnFailure \
    --azure-file-volume-share-name <your-file-share-name> \
    --azure-file-volume-account-name <your-storage-account-name> \
    --azure-file-volume-account-key <your-storage-account-key> \
    --azure-file-volume-mount-path /opt/flowise/.flowise
```

Replace the placeholders with your actual values.

4. Access AnswerAgentAI at the IP address (including port :3000) provided in the output.

## Tips and Best Practices

-   Use separate resource groups for different environments (e.g., development, staging, production).
-   Regularly update your AnswerAgentAI image to get the latest features and security updates.
-   Monitor your Azure resources for performance and cost optimization.
-   Implement proper security measures, such as network security groups and Azure Private Link, for production deployments.

## Troubleshooting

-   If you encounter issues with Terraform deployment, check the Azure activity log for detailed error messages.
-   For Container Instances, use `az container logs` to view container logs for debugging.
-   Ensure that all required environment variables are correctly set for AnswerAgentAI to function properly.

Remember to comply with Azure's best practices for security and cost management when deploying your AnswerAgentAI instance.

<!-- TODO: Add a video tutorial on deploying to Azure Container Instance -->
