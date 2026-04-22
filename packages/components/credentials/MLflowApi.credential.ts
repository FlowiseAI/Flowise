import { INodeParams, INodeCredential } from '../src/Interface'

class MLflowApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'MLflow API'
        this.name = 'mlflowApi'
        this.version = 1.0
        this.description =
            'Connect to an MLflow tracking server. For Databricks, set Tracking URI to "databricks" and provide a personal access token.'
        this.inputs = [
            {
                label: 'Tracking URI',
                name: 'mlflowTrackingUri',
                type: 'string',
                default: 'http://localhost:5000',
                placeholder: 'http://localhost:5000'
            },
            {
                label: 'Token',
                name: 'mlflowToken',
                type: 'password',
                optional: true,
                description: 'Bearer token for OSS MLflow or Databricks personal access token'
            },
            {
                label: 'Username',
                name: 'mlflowUsername',
                type: 'string',
                optional: true,
                description: 'Username for basic auth (OSS MLflow only)'
            },
            {
                label: 'Password',
                name: 'mlflowPassword',
                type: 'password',
                optional: true,
                description: 'Password for basic auth (OSS MLflow only)'
            }
        ]
    }
}

module.exports = { credClass: MLflowApi }
