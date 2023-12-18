import { SSTConfig } from 'sst'
import { RDS, Service } from 'sst/constructs'

export default {
    config(_input) {
        return {
            name: 'Flowise',
            region: 'us-east-1'
        }
    },
    stacks(app) {
        app.stack(function Site({ stack }) {
            const database = new RDS(stack, 'Database', {
                engine: 'postgresql11.13',
                defaultDatabaseName: 'flowise'
            })

            const service = new Service(stack, 'Flowise', {
                customDomain: 'last-rev.chatflow.theanswer.ai',

                bind: [database],
                environment: {
                    PORT: process.env.PORT,
                    CORS_ORIGINS: process.env.CORS_ORIGINS,
                    IFRAME_ORIGINS: process.env.IFRAME_ORIGINS,
                    FLOWISE_USERNAME: process.env.FLOWISE_USERNAME,
                    FLOWISE_PASSWORD: process.env.FLOWISE_PASSWORD,
                    FLOWISE_FILE_SIZE_LIMIT: process.env.FLOWISE_FILE_SIZE_LIMIT,
                    DEBUG: process.env.DEBUG,
                    DATABASE_PATH: process.env.DATABASE_PATH,
                    DATABASE_TYPE: process.env.DATABASE_TYPE,
                    DATABASE_PORT: process.env.DATABASE_PORT,
                    DATABASE_HOST: process.env.DATABASE_HOST,
                    DATABASE_NAME: process.env.DATABASE_NAME,
                    DATABASE_USER: process.env.DATABASE_USER,
                    DATABASE_PASSWORD: process.env.DATABASE_PASSWORD,
                    DATABASE_SSL: process.env.DATABASE_SSL,
                    DATABASE_SSL_KEY_BASE64: process.env.DATABASE_SSL_KEY_BASE64,
                    APIKEY_PATH: process.env.APIKEY_PATH,
                    SECRETKEY_PATH: process.env.SECRETKEY_PATH,
                    FLOWISE_SECRETKEY_OVERWRITE: process.env.FLOWISE_SECRETKEY_OVERWRITE,
                    LOG_LEVEL: process.env.LOG_LEVEL,
                    LOG_PATH: process.env.LOG_PATH,
                    DISABLE_FLOWISE_TELEMETRY: process.env.DISABLE_FLOWISE_TELEMETRY,
                    DOMAIN: process.env.DOMAIN,
                    AUTH0_JWKS_URI: process.env.AUTH0_JWKS_URI,
                    AUTH0_SECRET: process.env.AUTH0_SECRET,
                    AUTH0_ISSUER_BASE_URL: process.env.AUTH0_ISSUER_BASE_URL,
                    AUTH0_BASE_URL: process.env.AUTH0_BASE_URL,
                    AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
                    AUTH0_CLIENT_SECRET: process.env.AUTH0_CLIENT_SECRET,
                    AUTH0_AUDIENCE: process.env.AUTH0_AUDIENCE,
                    AUTH0_SCOPE: process.env.AUTH0_SCOPE,
                    AUTH0_TOKEN_SIGN_ALG: process.env.AUTH0_TOKEN_SIGN_ALG,
                    AUTH0_ORGANIZATION_ID: process.env.AUTH0_ORGANIZATION_ID,
                    MY_APP_REACT_APP_AUTH_DOMAIN: process.env.MY_APP_REACT_APP_AUTH_DOMAIN,
                    MY_APP_REACT_APP_AUTH_CLIENT_ID: process.env.MY_APP_REACT_APP_AUTH_CLIENT_ID,
                    MY_APP_REACT_APP_AUTH_AUDIENCE: process.env.MY_APP_REACT_APP_AUTH_AUDIENCE,
                    MY_APP_REACT_APP_AUTH_ORGANIZATION_ID: process.env.MY_APP_REACT_APP_AUTH_ORGANIZATION_ID
                },
                port: Number.parseInt(process.env.PORT ?? '4000')
                // cdk: {
                //     container: { image: ContainerImage.fromRegistry('005613854457.dkr.ecr.us-east-1.amazonaws.com/answers-flowise') }
                // }
            })
            // Grants permissions to pull private images from the ECR registry
            // service.cdk?.taskDefinition.executionRole?.addManagedPolicy({
            //     managedPolicyArn: 'arn:aws:iam::aws:policy/AmazonECSTaskExecutionRolePolicy'
            // })

            stack.addOutputs({
                ServiceUrl: service.url
            })
        })
    }
} satisfies SSTConfig
