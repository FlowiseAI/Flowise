type ConversationalRetrievalQAChainConstructor = new (fields?: { sessionId?: string }) => {
    label: string
    name: string
    category: string
    description: string
    tags?: string[]
}

const { nodeClass: OriginalConversationalRetrievalQAChain } = require('./ConversationalRetrievalQAChain') as {
    nodeClass: ConversationalRetrievalQAChainConstructor
}

class AAIConversationalRetrievalQAChain_Chains extends OriginalConversationalRetrievalQAChain {
    constructor(fields?: { sessionId?: string }) {
        super(fields)
        this.label = 'Document'
        this.name = 'aaiConversationalRetrievalQAChain'
        this.category = 'Chains'
        this.description =
            'Use for workflows that involve uploading files, chatting with large datasets, and querying/uploading information.'
        this.tags = ['AAI']
    }
}

module.exports = { nodeClass: AAIConversationalRetrievalQAChain_Chains }
