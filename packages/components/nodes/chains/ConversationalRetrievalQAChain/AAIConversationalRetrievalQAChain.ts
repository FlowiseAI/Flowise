const { nodeClass: OriginalConversationalRetrievalQAChain } = require('./ConversationalRetrievalQAChain')

class AAIConversationalRetrievalQAChain_Chains extends (OriginalConversationalRetrievalQAChain as any) {
    constructor(fields?: { sessionId?: string }) {
        super(fields)
        this.label = 'Document'
        this.name = 'aaiConversationalRetrievalQAChain'
        this.category = 'Chains'
        this.description = 'Use for workflows that involve uploading files, chatting with large datasets, and querying/uploading information.'
        this.tags = ['AAI']
    }
}

module.exports = { nodeClass: AAIConversationalRetrievalQAChain_Chains } 