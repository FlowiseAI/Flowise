import { INode, INodeParams } from '../../../src/Interface'

class JLINC_Analytic implements INode {
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
        this.label = 'JLINC'
        this.name = 'jlinc'
        this.version = 1.0
        this.type = 'JLINC'
        this.icon = 'jlinc.png'
        this.category = 'Analytic'
        this.baseClasses = [this.type]
        this.inputs = []
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['jlincApi']
        }
    }
}

module.exports = { nodeClass: JLINC_Analytic }
