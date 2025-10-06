import {
    IAction,
    ICommonObject,
    IFileUpload,
    IHumanInput,
    INode,
    INodeData as INodeDataFromComponent,
    INodeExecutionData,
    INodeParams,
    IServerSideEventStreamer
} from 'flowise-components'
import { DataSource } from 'typeorm'
import { CachePool } from './CachePool'
import { Telemetry } from './utils/telemetry'
import { ChatflowVisibility } from './database/entities/ChatFlow'

export type MessageType = 'apiMessage' | 'userMessage'

export type ChatflowType = 'CHATFLOW' | 'MULTIAGENT' | 'ASSISTANT' | 'AGENTFLOW'

export type AssistantType = 'CUSTOM' | 'OPENAI' | 'AZURE'

export type ExecutionState = 'INPROGRESS' | 'FINISHED' | 'ERROR' | 'TERMINATED' | 'TIMEOUT' | 'STOPPED'

export enum MODE {
    QUEUE = 'queue',
    MAIN = 'main'
}

export enum ChatType {
    INTERNAL = 'INTERNAL',
    EXTERNAL = 'EXTERNAL'
}

export enum ChatMessageRatingType {
    THUMBS_UP = 'THUMBS_UP',
    THUMBS_DOWN = 'THUMBS_DOWN'
}

export enum AppCsvParseRunsStatus {
    PENDING = 'PENDING',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETE_WITH_ERRORS = 'COMPLETE_WITH_ERRORS',
    COMPLETE = 'COMPLETE',
    GENERATING_CSV = 'GENERATING_CSV',
    READY = 'READY'
}

export enum AppCsvParseRowStatus {
    PENDING = 'PENDING',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETE_WITH_ERRORS = 'COMPLETE_WITH_ERRORS',
    COMPLETE = 'COMPLETE'
}
/**
 * Databases
 */
export interface IUser {
    id: string
    name: string
    email: string
    organizationId: string
    stripeCustomerId?: string
    defaultChatflowId?: string
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
    enabledIntegrations?: string
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
    speechToText?: string
    chatbotConfig?: string
    followUpPrompts?: string
    apiConfig?: string
    category?: string
    visibility?: string[]
    type?: ChatflowType
    userId: string
    organizationId: string
    displayMode?: string
    embeddedUrl?: string
    browserExtConfig?: string
    templateId?: string
}

export interface IChatMessage {
    id: string
    role: MessageType
    content: string
    chatflowid: string
    executionId?: string
    sourceDocuments?: string
    usedTools?: string
    fileAnnotations?: string
    agentReasoning?: string
    fileUploads?: string
    artifacts?: string
    chatType: string
    chatId: string
    userId?: string
    organizationId?: string
    memoryType?: string
    sessionId?: string
    createdDate: Date
    leadEmail?: string
    action?: string | null
    followUpPrompts?: string
    trackingMetadata?: string
}

export interface IChatMessageFeedback {
    id: string
    content?: string
    chatflowid: string
    chatId: string
    messageId: string
    rating: ChatMessageRatingType
    userId?: string
    organizationId?: string
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

export interface IExecution {
    id: string
    executionData: string
    state: ExecutionState
    agentflowId: string
    sessionId: string
    isPublic?: boolean
    action?: string
    userId?: string
    organizationId?: string
    createdDate: Date
    updatedDate: Date
    stoppedDate: Date
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
    parentNode?: string
    extent?: string
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

export interface IAgentflowExecutedData {
    nodeLabel: string
    nodeId: string
    data: INodeExecutionData
    previousNodeIds: string[]
    status?: ExecutionState
}

export interface IMessage {
    message: string
    type: MessageType
    role?: MessageType
    content?: string
}

export interface IncomingInput {
    user: IUser
    question: string
    overrideConfig?: ICommonObject
    chatId?: string
    sessionId?: string
    stopNodeId?: string
    uploads?: IFileUpload[]
    leadEmail?: string
    history?: IMessage[]
    action?: IAction
    chatType?: string
    streaming?: boolean
    trackingMetadata?: ICommonObject
}

export interface IncomingAgentflowInput extends Omit<IncomingInput, 'question'> {
    question?: string
    form?: Record<string, any>
    humanInput?: IHumanInput
}

export interface IActiveChatflows {
    [key: string]: {
        startingNodes: IReactFlowNode[]
        endingNodeData?: INodeData
        inSync: boolean
        overrideConfig?: ICommonObject
        chatId?: string
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
    schema?: ICommonObject[]
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
export interface ICustomTemplate {
    id: string
    name: string
    description?: string
    flowData: string
    screenshot?: string
    type?: string
    badge?: string
    framework?: string
    usecases?: string
    userId?: string
    organizationId?: string
    shareWithOrg?: boolean
    deletedDate?: Date
    parentId?: string
}

export interface IFlowConfig {
    chatflowid: string
    chatId: string
    sessionId: string
    chatHistory: IMessage[]
    apiMessageId: string
    overrideConfig?: ICommonObject
    state?: ICommonObject
    runtimeChatHistoryLength?: number
}

export interface IPredictionQueueAppServer {
    appDataSource: DataSource
    componentNodes: IComponentNodes
    sseStreamer: IServerSideEventStreamer
    telemetry: Telemetry
    cachePool: CachePool
}

export interface IExecuteFlowParams extends IPredictionQueueAppServer {
    incomingInput: IncomingInput
    chatflow: IChatFlow
    chatId: string
    baseURL: string
    isInternal: boolean
    signal?: AbortController
    files?: Express.Multer.File[]
    fileUploads?: IFileUpload[]
    uploadedFilesContent?: string
    isUpsert?: boolean
    user: IUser
    isRecursive?: boolean
    parentExecutionId?: string
    iterationContext?: ICommonObject
    isTool?: boolean
}

export interface INodeOverrides {
    [key: string]: {
        label: string
        name: string
        type: string
        enabled: boolean
    }[]
}

export interface IVariableOverride {
    id: string
    name: string
    type: 'static' | 'runtime'
    enabled: boolean
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
    stripeCustomerId: string
    userId: string
    organizationId: string
    resourceType: 'CREDITS'
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

export interface IAppCsvParseRuns {
    id: string
    userId: string
    organizationId: string
    startedAt: Date
    completedAt?: Date
    rowsRequested: number
    rowsProcessed?: number
    name: string
    configuration: ICommonObject
    originalCsvUrl: string
    processedCsvUrl?: string
    chatflowChatId: string
    includeOriginalColumns: boolean
    status: AppCsvParseRunsStatus
    errorMessages: string[]
}

export interface IAppCsvParseRows {
    id: string
    csvParseRunId: string
    rowNumber: number
    rowData: ICommonObject
    generatedData?: ICommonObject
    status: AppCsvParseRowStatus
    errorMessage?: string
    createdAt: Date
    updatedAt: Date
}

// DocumentStore related
export * from './Interface.DocumentStore'
