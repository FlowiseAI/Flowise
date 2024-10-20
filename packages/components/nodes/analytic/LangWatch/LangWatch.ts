import { INode, INodeParams } from '../../../src/Interface'

class LangWatch_Analytic implements INode {
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
        this.label = 'LangWatch'
        this.name = 'LangWatch'
        this.version = 1.0
        this.type = 'LangWatch'
        this.icon = 'LangWatch.svg'
        this.category = 'Analytic'
        this.baseClasses = [this.type]
        this.inputs = []
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['langwatchApi']
        }
    }
}

module.exports = { nodeClass: LangWatch_Analytic }
