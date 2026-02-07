import { INode, INodeParams } from '../../../src/Interface'

class MLflow_Analytic implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs?: INodeParams[]
    credential: INodeParams

    constructor() {
        this.label = 'MLflow'
        this.name = 'mlflow'
        this.version = 1.0
        this.type = 'MLflow'
        this.icon = 'mlflow.svg'
        this.category = 'Analytic'
        this.baseClasses = [this.type]
        this.inputs = []
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['mlflowApi']
        }
    }
}

module.exports = { nodeClass: MLflow_Analytic }
