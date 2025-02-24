import { INode, INodeParams } from '../../../src/Interface'

class Arize_Analytic implements INode {
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
        this.label = 'Arize'
        this.name = 'arize'
        this.version = 1.0
        this.type = 'Arize'
        this.icon = 'arize.png'
        this.category = 'Analytic'
        this.baseClasses = [this.type]
        this.inputs = []
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['arizeApi']
        }
    }
}

module.exports = { nodeClass: Arize_Analytic }
