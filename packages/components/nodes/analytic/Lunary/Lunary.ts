import { INode, INodeParams } from '../../../src/Interface'

class Lunary_Analytic implements INode {
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
        this.label = 'Lunary'
        this.name = 'lunary'
        this.version = 1.0
        this.type = 'Lunary'
        this.icon = 'Lunary.svg'
        this.category = 'Analytic'
        this.baseClasses = [this.type]
        this.inputs = []
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['lunaryApi']
        }
    }
}

module.exports = { nodeClass: Lunary_Analytic }
