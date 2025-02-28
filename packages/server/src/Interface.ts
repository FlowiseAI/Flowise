import { IAction } from 'flowise-components'
import { ICommonObject, IFileUpload, INode, INodeData as INodeDataFromComponent, INodeParams } from 'flowise-components'
import { ChatflowVisibility } from './database/entities/ChatFlow'

export type MessageType = 'apiMessage' | 'userMessage'

export type ChatflowType = 'CHATFLOW' | 'MULTIAGENT'

export enum chatType {
    INTERNAL = 'INTERNAL',
    EXTERNAL = 'EXTERNAL'
}

export enum ChatMessageRatingType {
    THUMBS_UP = 'THUMBS_UP',
    THUMBS_DOWN = 'THUMBS_DOWN'
}
/**
 * Databases
 */
export interface IUser {
    id: string
    name: string
    email: string
    organizationId?: string
    stripeCustomerId?: string
    updatedDate: Date
    createdDate: Date
    permissions?: string[]
    roles?: string[]
    apiKey?: {
        id: string
        metadata?: IApiKeyMetadata
    }
}
export interface IOrganization {
    id: string
    name: string
    stripeCustomerId?: string
    updatedDate: Date
    createdDate: Date
}

export interface IChatFlow {
    id: string
    name: string
    flowData: string
    updatedDate: Date
    createdDate: Date
    deployed?: boolean
    isPublic?: boolean
    apikeyid?: string
    analytic?: string
    chatbotConfig?: string
    apiConfig?: string
    category?: string
    visibility?: string[]
    type?: ChatflowType
    userId?: string
    organizationId?: string
    displayMode?: string
    embeddedUrl?: string
}

export interface IChatMessage {
    id: string
    role: MessageType
    content: string
    chatflowid: string
    sourceDocuments?: string
    usedTools?: string
    fileAnnotations?: string
    agentReasoning?: string
    fileUploads?: string
    chatType: string
    chatId: string
    userId: string
    memoryType?: string
    sessionId?: string
    createdDate: Date
    leadEmail?: string
    action?: string | null
}

export interface IChatMessageFeedback {
    id: string
    content?: string
    chatflowid: string
    chatId: string
    messageId: string
    rating: ChatMessageRatingType
    createdDate: Date
}

export interface ITool {
    id: string
    name: string
    description: string
    color: string
    iconSrc?: string
    schema?: string
    func?: string
    updatedDate: Date
    createdDate: Date
}

export interface IAssistant {
    id: string
    details: string
    credential: string
    iconSrc?: string
    updatedDate: Date
    createdDate: Date
}

export interface ICredential {
    id: string
    name: string
    credentialName: string
    encryptedData: string
    updatedDate: Date
    createdDate: Date
}

export interface IVariable {
    id: string
    name: string
    value: string
    type: string
    updatedDate: Date
    createdDate: Date
}

export interface ILead {
    id: string
    name?: string
    email?: string
    phone?: string
    chatflowid: string
    chatId: string
    createdDate: Date
}

export interface IUpsertHistory {
    id: string
    chatflowid: string
    result: string
    flowData: string
    date: Date
}

export interface IComponentNodes {
    [key: string]: INode
}

export interface IComponentCredentials {
    [key: string]: INode
}

export interface IVariableDict {
    [key: string]: string
}

export interface INodeDependencies {
    [key: string]: number
}

export interface INodeDirectedGraph {
    [key: string]: string[]
}

export interface INodeData extends INodeDataFromComponent {
    inputAnchors: INodeParams[]
    inputParams: INodeParams[]
    outputAnchors: INodeParams[]
}

export interface IReactFlowNode {
    id: string
    position: {
        x: number
        y: number
    }
    type: string
    data: INodeData
    positionAbsolute: {
        x: number
        y: number
    }
    z: number
    handleBounds: {
        source: any
        target: any
    }
    width: number
    height: number
    selected: boolean
    dragging: boolean
}

export interface IReactFlowEdge {
    source: string
    sourceHandle: string
    target: string
    targetHandle: string
    type: string
    id: string
    data: {
        label: string
    }
}

export interface IReactFlowObject {
    nodes: IReactFlowNode[]
    edges: IReactFlowEdge[]
    viewport: {
        x: number
        y: number
        zoom: number
    }
}

export interface IExploredNode {
    [key: string]: {
        remainingLoop: number
        lastSeenDepth: number
    }
}

export interface INodeQueue {
    nodeId: string
    depth: number
}

export interface IDepthQueue {
    [key: string]: number
}

export interface IMessage {
    message: string
    type: MessageType
    role?: MessageType
    content?: string
}

export interface IncomingInput {
    question: string
    overrideConfig?: ICommonObject
    socketIOClientId?: string
    chatId?: string
    stopNodeId?: string
    uploads?: IFileUpload[]
    leadEmail?: string
    history?: IMessage[]
    action?: IAction
    chatType?: string
}

export interface IActiveChatflows {
    [key: string]: {
        startingNodes: IReactFlowNode[]
        endingNodeData?: INodeData
        inSync: boolean
        overrideConfig?: ICommonObject
    }
}

export interface IActiveCache {
    [key: string]: Map<any, any>
}

export interface IOverrideConfig {
    node: string
    nodeId: string
    label: string
    name: string
    type: string
}

export type ICredentialDataDecrypted = ICommonObject

// Plain credential object sent to server
export interface ICredentialReqBody {
    name: string
    credentialName: string
    plainDataObj: ICredentialDataDecrypted
    userId?: string
    organizationId?: string
    visibility?: ChatflowVisibility[]
}

// Decrypted credential object sent back to client
export interface ICredentialReturnResponse extends ICredential {
    plainDataObj: ICredentialDataDecrypted
}

export interface IUploadFileSizeAndTypes {
    fileTypes: string[]
    maxUploadSize: number
}

export interface IApiKeyMetadata {
    createdBy?: string
    allowedScopes?: string[]
    description?: string
}

export interface IApiKey {
    id: string
    keyName: string
    apiKey: string
    apiSecret: string
    updatedDate: Date
    organizationId: string
    userId: string
    lastUsedAt?: Date
    isActive: boolean
    metadata?: IApiKeyMetadata
}

export interface ITrialPlan {
    availableExecutions: number
    usedExecutions: number
}

export interface IPaidPlan {
    amount: number
    currency: string
    availableExecutions: number
    usedExecutions: number
    createdDate: Date
}

export interface ISubscription {
    id: string
    entityType: 'user' | 'organization'
    entityId: string
    organizationId?: string
    subscriptionType: 'FREE' | 'PAID' | 'ENTERPRISE'
    stripeSubscriptionId: string
    stripeSubscriptionItemId: string
    status: string
    creditsLimit: number
    currentPeriodStart: Date
    currentPeriodEnd: Date
    createdDate: Date
}

export interface IUsageEvent {
    id: string
    entityType: 'user' | 'organization'
    entityId: string
    organizationId?: string
    resourceType: 'AI_TOKENS' | 'COMPUTE'
    quantity: number
    creditsConsumed: number
    stripeMeterEventId?: string
    traceId?: string
    metadata?: Record<string, any>
    createdDate: Date
}

export interface IBlockingStatus {
    id: string
    entityType: 'user' | 'organization'
    entityId: string
    organizationId?: string
    isBlocked: boolean
    reason?: string
    createdDate: Date
}

export interface IStripeEvent {
    id: string
    stripeEventId: string
    eventType: string
    eventData: any
    processed: boolean
    createdDate: Date
}

// DocumentStore related
export * from './Interface.DocumentStore'
