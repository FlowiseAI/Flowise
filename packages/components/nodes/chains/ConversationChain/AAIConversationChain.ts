import { INode } from '../../../src/Interface'

type ConversationChainConstructor = new (fields?: { sessionId?: string }) => INode & {
    tags?: string[]
    label: string
    name: string
    category: string
    description: string
}

const { nodeClass: OriginalConversationChain } = require('./ConversationChain') as {
    nodeClass: ConversationChainConstructor
}

let systemMessage = `The following is a friendly conversation between a human and an AI. The AI is talkative and provides lots of specific details from its context. If the AI does not know the answer to a question, it truthfully says it does not know.`
const inputKey = 'input'

// AAI-branded clone of ConversationChain that relies on AAI default credentials
class AAIConversationChain_Chains extends OriginalConversationChain {
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
