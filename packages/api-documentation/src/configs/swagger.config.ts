//@ts-ignore
import swaggerJSDoc from 'swagger-jsdoc'

const swaggerUiOptions = {
    failOnErrors: true, // Throw when parsing errors
    baseDir: __dirname, // Base directory which we use to locate your JSDOC files
    exposeApiDocs: true,
    definition: {
        openapi: '3.0.3',
        info: {
            title: 'Flowise APIs',
            summary: 'Interactive swagger-ui auto-generated API docs from express, based on a swagger.yml file',
            version: '1.0.0',
            description:
                'This module serves auto-generated swagger-ui generated API docs from express, based on a swagger.yml file. \n\n This module works only when running Flowise in dev mode. \n\n The result is living documentation for Flowise API served via http://localhost:6655/api-docs route.',
            termsOfService: 'https://flowiseai.com',
            license: {
                name: 'FlowiseAI',
                url: 'https://github.com/FlowiseAI/Flowise/blob/main/LICENSE.md'
            },
            contact: {
                name: 'Octavian FlowiseAI',
                email: 'octavian.selardi@flowiseai.com'
            }
        },
        servers: [
            {
                url: 'http://localhost:3000/api/v1',
                description: 'Flowise Server Dev Mode'
            }
        ]
    },
    apis: [`${process.cwd()}/dist/routes/**/*.js`, `${process.cwd()}/src/yml/swagger.yml`]
}

// https://github.com/swagger-api/swagger-ui/blob/master/docs/usage/configuration.md
const swaggerExplorerOptions = {
    swaggerOptions: {
        validatorUrl: '127.0.0.1'
    },
    explorer: true
}

const swaggerDocs = swaggerJSDoc(swaggerUiOptions)

export { swaggerDocs, swaggerExplorerOptions }
