type LLMChainConstructor = new () => {
    label: string
    name: string
    category: string
    description: string
    tags?: string[]
}

const { nodeClass: OriginalLLMChain } = require('./LLMChain') as {
    nodeClass: LLMChainConstructor
}

class AAILLMChain_Chains extends OriginalLLMChain {
    constructor() {
        super()
        this.label = 'One-Shot Workflow'
        this.name = 'aaiLLMChain'
        this.category = 'Chains'
        this.description = 'Intended for standardized input/output scenarios that do not require conversational memory.'
        this.tags = ['AAI']
    }
}

module.exports = { nodeClass: AAILLMChain_Chains }
