import { INode, INodeParams } from '../../../src/Interface'

class Phoenix_Analytic implements INode {
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
        this.label = 'Phoenix'
        this.name = 'phoenix'
        this.version = 1.0
        this.type = 'Phoenix'
        this.icon = 'phoenix.png'
        this.category = 'Analytic'
        this.baseClasses = [this.type]
        this.inputs = []
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['phoenixApi']
        }
    }
}

module.exports = { nodeClass: Phoenix_Analytic }
