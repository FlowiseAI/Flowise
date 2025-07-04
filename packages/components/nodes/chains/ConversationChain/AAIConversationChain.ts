const { nodeClass: OriginalConversationChain } = require('./ConversationChain')

class AAIConversationChain_Chains extends (OriginalConversationChain as any) {
    constructor(fields?: { sessionId?: string }) {
        super(fields)
        this.label = 'Conversation Chain'
        this.name = 'aaiConversationChain'
        this.category = 'Chains'
        this.description = 'Great for conversation characters and general Q&A.'
        this.tags = ['AAI']
    }
}

module.exports = { nodeClass: AAIConversationChain_Chains } 