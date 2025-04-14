import { INode, INodeParams } from '../../../src/Interface'

class Opik_Analytic implements INode {
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
        this.label = 'Opik'
        this.name = 'opik'
        this.version = 1.0
        this.type = 'Opik'
        this.icon = 'opik.png'
        this.category = 'Analytic'
        this.baseClasses = [this.type]
        this.inputs = []
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['opikApi']
        }
    }
}

module.exports = { nodeClass: Opik_Analytic }
