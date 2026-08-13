import { INodeParams, INodeCredential } from '../src/Interface'

class AWSBedrockApiKey implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'AWS Bedrock API Key'
        this.name = 'awsBedrockApiKey'
        this.version = 1.0
        this.description =
            'AWS Bedrock API Key for bearer token authentication. ' +
            'Use this instead of IAM credentials when you have a Bedrock API Key. ' +
            'Also configurable via the AWS_BEARER_TOKEN_BEDROCK environment variable.'
        this.inputs = [
            {
                label: 'Bedrock API Key (Bearer Token)',
                name: 'bedrockBearerToken',
                type: 'password',
                placeholder: '<YOUR_BEDROCK_API_KEY>',
                description: 'The API Key for AWS Bedrock bearer token authentication.'
            }
        ]
    }
}

module.exports = { credClass: AWSBedrockApiKey }
