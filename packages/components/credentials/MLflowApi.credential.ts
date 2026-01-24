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
            'Refer to <a target="_blank" href="https://mlflow.org/docs/latest/index.html">official guide</a> on how to set up MLflow tracking server.'
        this.inputs = [
            {
                label: 'Tracking URI',
                name: 'mlflowTrackingUri',
                type: 'string',
                description: 'MLflow tracking server URI (e.g., http://localhost:5000)',
                placeholder: 'http://localhost:5000'
            },
            {
                label: 'API Token',
                name: 'mlflowApiToken',
                type: 'password',
                optional: true,
                description: 'API token for authenticated MLflow servers (e.g., Databricks, managed MLflow)'
            },
            {
                label: 'Username',
                name: 'mlflowUsername',
                type: 'string',
                optional: true,
                description: 'Username for basic auth (if required)'
            },
            {
                label: 'Password',
                name: 'mlflowPassword',
                type: 'password',
                optional: true,
                description: 'Password for basic auth (if required)'
            }
        ]
    }
}

module.exports = { credClass: MLflowApi }
