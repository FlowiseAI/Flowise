## Deploying an Environment for an Existing Application with AWS Copilot CLI

Before you start, make sure you have the following prerequisites:

-   AWS account
-   AWS CLI installed and configured with the new customer's AWS account
-   Docker installed
-   Copilot CLI installed
-   Environment variables for the application

Here are the environment variables required:

| Variable                         | Description                                           |
| -------------------------------- | ----------------------------------------------------- |
| PORT                             | The port the application runs on                      |
| APIKEY_PATH                      | The path to the API key                               |
| SECRETKEY_PATH                   | The path to the secret key                            |
| LOG_PATH                         | The path to the log files                             |
| DISABLE_FLOWISE_TELEMETRY        | Flag to disable telemetry                             |
| IFRAME_ORIGINS                   | Origins allowed to embed the application in an iframe |
| MY_APP_VITE_AUTH_DOMAIN          | Auth0 domain                                          |
| MY_APP_VITE_AUTH_CLIENT_ID       | Auth0 client ID                                       |
| MY_APP_VITE_AUTH_AUDIENCE        | Auth0 audience                                        |
| MY_APP_VITE_AUTH_ORGANIZATION_ID | Auth0 organization ID                                 |
| DOMAIN                           | The domain of the application                         |
| ANSWERAI_DOMAIN                  | The domain of AnswerAI                                |
| AUTH0_JWKS_URI                   | URI of Auth0 JWKS                                     |
| AUTH0_ISSUER_BASE_URL            | Base URL of Auth0 issuer                              |
| AUTH0_BASE_URL                   | Base URL of Auth0                                     |
| AUTH0_CLIENT_ID                  | Client ID of Auth0                                    |
| AUTH0_CLIENT_SECRET              | Client secret of Auth0                                |
| AUTH0_AUDIENCE                   | Audience of Auth0                                     |
| AUTH0_SCOPE                      | Scope of Auth0                                        |
| AUTH0_TOKEN_SIGN_ALG             | Token signing algorithm of Auth0                      |
| AUTH0_ORGANIZATION_ID            | Organization ID of Auth0                              |

Here are the steps to deploy an environment for an existing application:

1. **Clone the application repository**. This will get you the application code and configuration.

```bash
git clone https://github.com/answers-AI/Flowise
cd Flowise
```

2. **Create a new environment**. This will create a new environment, which is a standalone instance of your application.

```bash
copilot env init --name <env-name> --profile default

3. **Deploy the service**. This will build your Docker image, push it to Amazon ECR, and deploy it to Amazon ECS.
```

````bash
copilot svc deploy  --env <env-name>

4. **Access the service**. You can see the URL of your service by running:
```bash
copilot svc show
````
