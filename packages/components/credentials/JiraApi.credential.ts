import { INodeParams, INodeCredential } from '../src/Interface'

class JiraApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Jira API'
        this.name = 'jiraApi'
        this.version = 2.0
        this.description =
            'Refer to <a target="_blank" href="https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/">official guide</a> on how to get accessToken on Github'
        this.inputs = [
            {
                label: 'Authentication Type',
                name: 'authType',
                type: 'options',
                default: 'basicAuth',
                description: 'Choose between Basic Authentication or Bearer Token',
                options: [
                    {
                        label: 'Basic Auth (Email + API Token)',
                        name: 'basicAuth'
                    },
                    {
                        label: 'Bearer Token',
                        name: 'bearerToken'
                    }
                ]
            },
            {
                label: 'User Name',
                name: 'username',
                type: 'string',
                placeholder: 'username@example.com',
                description: 'Email or username for Basic Auth',
                show: {
                    authType: ['basicAuth']
                }
            },
            {
                label: 'Access Token',
                name: 'accessToken',
                type: 'password',
                placeholder: '<JIRA_ACCESS_TOKEN>',
                description: 'API token for Basic Auth',
                show: {
                    authType: ['basicAuth']
                }
            },
            {
                label: 'Bearer Token',
                name: 'bearerTokenValue',
                type: 'password',
                placeholder: '<JIRA_BEARER_TOKEN>',
                description: 'Bearer token for token-based authentication',
                show: {
                    authType: ['bearerToken']
                }
            },
            {
                label: 'SSL Certificate Path (Optional)',
                name: 'sslCertPath',
                type: 'string',
                placeholder: '/path/to/cert.pem',
                description: 'Path to SSL certificate file for self-signed certificates',
                optional: true
            },
            {
                label: 'SSL Key Path (Optional)',
                name: 'sslKeyPath',
                type: 'string',
                placeholder: '/path/to/key.pem',
                description: 'Path to SSL key file for client certificate authentication',
                optional: true
            },
            {
                label: 'Verify SSL Certificates',
                name: 'verifySslCerts',
                type: 'boolean',
                default: true,
                description: 'Whether to verify SSL certificates (disable only for self-signed certs)',
                optional: true
            }
        ]
    }
}

module.exports = { credClass: JiraApi }
