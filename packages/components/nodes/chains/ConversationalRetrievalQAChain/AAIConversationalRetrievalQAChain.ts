const { nodeClass: OriginalConversationalRetrievalQAChain } = require('./ConversationalRetrievalQAChain')

class AAIConversationalRetrievalQAChain_Chains extends (OriginalConversationalRetrievalQAChain as any) {
    constructor(fields?: { sessionId?: string }) {
        super(fields)
        this.label = 'AAI Conversational Retrieval QA Chain'
        this.name = 'aaiConversationalRetrievalQAChain'
        this.description = 'Retrieval QA Chain • Zero configuration required'
        this.tags = ['AAI']
    }
}

module.exports = { nodeClass: AAIConversationalRetrievalQAChain_Chains } 