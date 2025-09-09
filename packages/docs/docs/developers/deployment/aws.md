---
description: Learn how to deploy AnswerAgentAI on AWS using Copilot
---

# AWS

## Overview

AWS Copilot is a command-line interface (CLI) tool that simplifies the process of deploying and managing containerized applications on AWS. This guide will walk you through the steps to deploy AnswerAgentAI using AWS Copilot.

## Key Benefits

-   Simplified deployment process
-   Automatic infrastructure provisioning
-   Easy management of multiple environments

## Prerequisites

Before you begin, ensure you have the following:

-   An AWS account
-   AWS CLI installed and configured
-   Docker installed
-   AWS Copilot CLI installed
-   AnswerAgentAI application code
-   Environment variables for your application

## How to Use

### 1. Install AWS Copilot

If you haven't already installed AWS Copilot, you can do so by running:

```bash
brew install aws/tap/copilot-cli   # For macOS
```

For other operating systems, refer to the [AWS Copilot installation guide](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Copilot.html#copilot-install).

### 2. Configure AWS CLI

Ensure your AWS CLI is configured with the correct credentials:

```bash
aws configure
```

Verify your AWS credentials are working:

```bash
aws sts get-caller-identity
```

### 3. Set Up AWS Secrets Manager for Flowise Encryption Key

TheAnswer uses AWS Secrets Manager to securely store the Flowise encryption key. This provides better security and key rotation capabilities compared to storing the key in environment variables.

#### Create the Flowise Encryption Key Secret

If the secret doesn't exist, create it:

```bash
aws secretsmanager create-secret \
  --name FlowiseEncryptionKey \
  --secret-string 'your-secure-encryption-key-here'
```

**Note:** Replace `'your-secure-encryption-key-here'` with a strong, randomly generated encryption key (at least 32 characters).

#### Update an Existing Secret

If the secret already exists, update it:

```bash
aws secretsmanager put-secret-value \
  --secret-id FlowiseEncryptionKey \
  --secret-string 'your-new-encryption-key-here'
```

#### Verify the Secret

You can verify the secret was created/updated successfully:

```bash
aws secretsmanager describe-secret --secret-id FlowiseEncryptionKey
```

### 4. Clone the AnswerAgentAI Repository

Clone the AnswerAgentAI repository to your local machine:

```bash
git clone https://github.com/the-answeri/theanswer
cd theanswer
```

### 4. Initialize the Copilot Application

In the root directory of your AnswerAgentAI project, run:
Ensure yo uhave setup a hosted zone in AWS.
// TODO: Add Details

```bash
copilot app init --domain <your-domain>
```

Replace `<your-domain>` with your desired domain name, e.g., `myapp.theanswer.ai`.

### 5. Create a New Environment

Create a new environment for your application:

```bash
copilot env init --name <env-name> --profile default
```

Replace `<env-name>` with your desired environment name (e.g., "production" or "staging").

### 6. Set Up Environment Variables

Create an environment file named `<env-name>.env` in your project directory. Add all required environment variables to this file. For example:

```
PORT=3000
APIKEY_PATH=/path/to/api/key
SECRETKEY_PATH=/path/to/secret/key
LOG_PATH=/path/to/logs
DISABLE_FLOWISE_TELEMETRY=true
IFRAME_ORIGINS=https://example.com
MY_APP_VITE_AUTH_DOMAIN=your-auth-domain
MY_APP_VITE_AUTH_CLIENT_ID=your-auth-client-id

# Flowise Encryption Key Override - AWS Secrets Manager
SECRETKEY_STORAGE_TYPE="aws"
SECRETKEY_AWS_REGION="us-east-1"
SECRETKEY_AWS_NAME="FlowiseEncryptionKey"
...
```

For a list of all environment variables, please refer to the [Environment Variables](../environment-variables.md) page.

### 7. Deploy the Service

Deploy your AnswerAgentAI service to the created environment:

```bash
copilot svc deploy --env <env-name>
```

This command will build your Docker image, push it to Amazon ECR, and deploy it to Amazon ECS.

### 8. Access Your Deployed Service

To get the URL of your deployed service, run:

```bash
copilot svc show
```

This will display information about your service, including its public URL.

## Tips and Best Practices

-   Use separate environments (e.g., "staging" and "production") to test changes before deploying to production.
-   Regularly update your AWS Copilot CLI to access the latest features and improvements.
-   Use AWS Copilot's built-in commands to manage your application, such as `copilot svc logs` to view service logs.
-   Implement a CI/CD pipeline to automate deployments using AWS Copilot commands.

## Troubleshooting

### Issue: Deployment Fails

If your deployment fails, check the following:

1. Ensure all required environment variables are correctly set in your `<env-name>.env` file.
2. Verify that your AWS CLI is configured with the correct credentials and permissions.
3. Check the Copilot logs for detailed error messages:

```bash
copilot svc logs --env <env-name>
```

### Issue: Unable to Access the Deployed Service

If you can't access your deployed service:

1. Verify that the service is running:

```bash
copilot svc status --env <env-name>
```

2. Check if the correct ports are exposed in your Dockerfile and Copilot configuration.
3. Ensure your domain's DNS settings are correctly configured to point to the AWS-provided URL.

### Issue: AWS Secrets Manager Access Problems

If you encounter issues with AWS Secrets Manager:

1. **Verify AWS credentials and permissions:**

    ```bash
    aws sts get-caller-identity
    ```

2. **Check if the secret exists:**

    ```bash
    aws secretsmanager describe-secret --secret-id FlowiseEncryptionKey
    ```

3. **Verify IAM permissions:** Ensure your AWS user/role has the following permissions:

    - `secretsmanager:GetSecretValue`
    - `secretsmanager:DescribeSecret`
    - `secretsmanager:CreateSecret` (for initial setup)
    - `secretsmanager:PutSecretValue` (for updates)

4. **Check region consistency:** Ensure the `SECRETKEY_AWS_REGION` in your environment variables matches the region where the secret is stored.

5. **Test secret retrieval:**
    ```bash
    aws secretsmanager get-secret-value --secret-id FlowiseEncryptionKey
    ```

Remember to regularly update your AnswerAgentAI application and redeploy using Copilot to ensure you have the latest features and security updates.

<!-- TODO: Add a screenshot of the successful deployment -->
