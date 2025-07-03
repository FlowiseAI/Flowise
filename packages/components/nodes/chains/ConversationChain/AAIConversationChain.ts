const { nodeClass: OriginalConversationChain } = require('./ConversationChain')

class AAIConversationChain_Chains extends (OriginalConversationChain as any) {
    constructor(fields?: { sessionId?: string }) {
        super(fields)
        this.label = 'AAI Conversation Chain'
        this.name = 'aaiConversationChain'
        this.description = 'Conversation Chain • Zero configuration required'
        this.tags = ['AAI']
    }
}

module.exports = { nodeClass: AAIConversationChain_Chains } 