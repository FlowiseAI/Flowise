## Deploying an Environment for an Existing Application with AWS Copilot CLI

Before you start, make sure you have the following prerequisites:
${copilot-env} = AWS copilot environment name

-   AWS account
-   AWS CLI installed and configured with the new customer's AWS account
-   Docker installed
-   AWS Copilot CLI installed: https://aws.github.io/copilot-cli/docs/getting-started/install/
-   Route53 Hosted zone configured with `${copilot-env}.theanswer.ai` (make sure the NS records are shared with the AnswerAI team)
-   Environment variables for the application saved into a `copilot-${copilot-env}.env`
-   Install saml2aws: https://github.com/Versent/saml2aws
-   If you are using Okta you need to Run saml2aws login with (saml2aws login --role=arn:aws:iam::654654492112:role/IAS-AnswerAi)
-   duplicate the manifest folder for staging `copilot/environments/staging` and update the folder name to be the ${copilot-env} value and update the name in the manifest.yaml file to have the same ${copilot-env} value
-   before running commands run this in the terminal `export AWS_PROFILE=saml`
    Use the template for env variables: ./copilot._environment_.env.template

Here are the steps to deploy an environment for an existing application:

## First Time Setup

1. **Clone the application repository**. This will get you the application code and configuration.

```bash
git clone https://github.com/the-answerai/theanswer
cd Flowise
```

2. **Create a new environment**. This will create a new environment, which is a standalone instance of your application.

```bash
copilot app init --domain ${env}.flowise.theanswer.ai
```

3. **Create a new environment**. This will create a new environment, which is a standalone instance of your application.

```bash
copilot env init --name <env-name> --profile default
```

NOTE: This will deploy the CURRENT branch you are on 4. **Deploy the service**. This will build your Docker image, push it to Amazon ECR, and deploy it to Amazon ECS.

````bash
copilot svc deploy  --env <env-name>
```

5. **Access the service**. You can see the URL of your service by running:
```bash
copilot svc show
````

6. **Show the logs of your service**. This command will show you the logs of your service. You can specify the number of lines to show with the `--limit` flag.

```bash
copilot svc logs --limit 100
```

## Deployment of new code and settings
