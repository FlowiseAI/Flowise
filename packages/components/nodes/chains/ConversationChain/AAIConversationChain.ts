import { ConversationChain } from 'langchain/chains'
import {
    ChatPromptTemplate,
    HumanMessagePromptTemplate,
    MessagesPlaceholder,
    SystemMessagePromptTemplate,
    BaseMessagePromptTemplateLike,
    PromptTemplate
} from '@langchain/core/prompts'
import { RunnableSequence } from '@langchain/core/runnables'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { HumanMessage } from '@langchain/core/messages'
import { ConsoleCallbackHandler as LCConsoleCallbackHandler } from '@langchain/core/tracers/console'
import { checkInputs, Moderation, streamResponse } from '../../moderation/Moderation'
import { formatResponse } from '../../outputparsers/OutputParserHelpers'
import { addImagesToMessages, llmSupportsVision } from '../../../src/multiModalUtils'
import { ChatOpenAI } from '../../chatmodels/ChatOpenAI/FlowiseChatOpenAI'
import {
    IVisionChatModal,
    FlowiseMemory,
    ICommonObject,
    INode,
    INodeData,
    INodeParams,
    MessageContentImageUrl,
    IServerSideEventStreamer
} from '../../../src/Interface'
import { ConsoleCallbackHandler, CustomChainHandler, additionalCallbacks } from '../../../src/handler'
import { getBaseClasses, handleEscapeCharacters, transformBracesWithColon } from '../../../src/utils'

const { nodeClass: OriginalConversationChain } = require('./ConversationChain')

let systemMessage = `The following is a friendly conversation between a human and an AI. The AI is talkative and provides lots of specific details from its context. If the AI does not know the answer to a question, it truthfully says it does not know.`
const inputKey = 'input'

// AAI-branded clone of ConversationChain that relies on AAI default credentials
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