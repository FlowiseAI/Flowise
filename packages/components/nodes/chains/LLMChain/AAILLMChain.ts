const { nodeClass: OriginalLLMChain } = require('./LLMChain')

class AAILLMChain_Chains extends (OriginalLLMChain as any) {
    constructor(fields?: { sessionId?: string }) {
        super(fields)
        this.label = 'One-Shot Workflow'
        this.name = 'aaiLLMChain'
        this.category = 'Chains'
        this.description = 'Intended for standardized input/output scenarios that do not require conversational memory.'
        this.tags = ['AAI']
    }
}

module.exports = { nodeClass: AAILLMChain_Chains } 