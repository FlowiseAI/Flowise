import { INode } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'

class Calculator implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]

    constructor() {
        this.label = 'Calculator'
        this.name = 'calculator'
        this.type = 'Calculator'
        this.icon = 'calculator.svg'
        this.category = 'Tools'
        this.description = 'Perform calculations on response'
    }

    async getBaseClasses(): Promise<string[]> {
        const { Calculator } = await import('langchain/tools')
        return getBaseClasses(Calculator)
    }

    async init(): Promise<any> {
        const { Calculator } = await import('langchain/tools')
        return new Calculator()
    }
}

module.exports = { nodeClass: Calculator }
