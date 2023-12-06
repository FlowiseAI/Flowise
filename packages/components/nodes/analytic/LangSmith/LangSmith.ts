import { INode, INodeParams } from '../../../src/Interface'

class LangSmith_Analytic implements INode {
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
        this.label = 'LangSmith'
        this.name = 'langSmith'
        this.version = 1.0
        this.type = 'LangSmith'
        this.icon = 'langchain.png'
        this.category = 'Analytic'
        this.baseClasses = [this.type]
        this.inputs = []
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['langsmithApi']
        }
    }
}

module.exports = { nodeClass: LangSmith_Analytic }
