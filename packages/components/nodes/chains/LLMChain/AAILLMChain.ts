const { nodeClass: OriginalLLMChain } = require('./LLMChain')

class AAILLMChain_Chains extends (OriginalLLMChain as any) {
    constructor(fields?: { sessionId?: string }) {
        super(fields)
        this.label = 'AAI LLM Chain'
        this.name = 'aaiLLMChain'
        this.description = 'LLM Chain • Zero configuration required'
        this.tags = ['AAI']
    }
}

module.exports = { nodeClass: AAILLMChain_Chains } 