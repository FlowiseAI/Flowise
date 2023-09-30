import { INodeParams, INodeCredential } from '../src/Interface'

class AWSApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    optional: boolean
    inputs: INodeParams[]

    constructor() {
        this.label = 'AWS security credentials'
        this.name = 'awsApi'
        this.version = 1.0
        this.description =
            'Your <a target="_blank" href="https://docs.aws.amazon.com/IAM/latest/UserGuide/security-creds.html">AWS security credentials</a>. When unspecified, credentials will be sourced from the runtime environment according to the default AWS SDK behavior.'
        this.optional = true
        this.inputs = [
            {
                label: 'AWS Access Key',
                name: 'awsKey',
                type: 'string',
                placeholder: '<AWS_ACCESS_KEY_ID>',
                description: 'The access key for your AWS account.',
                optional: true
            },
            {
                label: 'AWS Secret Access Key',
                name: 'awsSecret',
                type: 'password',
                placeholder: '<AWS_SECRET_ACCESS_KEY>',
                description: 'The secret key for your AWS account.',
                optional: true
            },
            {
                label: 'AWS Session Key',
                name: 'awsSession',
                type: 'password',
                placeholder: '<AWS_SESSION_TOKEN>',
                description: 'The session key for your AWS account. This is only needed when you are using temporary credentials.',
                optional: true
            }
        ]
    }
}

module.exports = { credClass: AWSApi }
