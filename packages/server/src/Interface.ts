import { IAction, ICommonObject, IFileUpload, INode, INodeData as INodeDataFromComponent, INodeParams } from 'flowise-components'

export type MessageType = 'apiMessage' | 'userMessage'

export type ChatflowType = 'CHATFLOW' | 'MULTIAGENT'

export enum ChatType {
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
    followUpPrompts?: string
    apiConfig?: string
    category?: string
    type?: ChatflowType
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
    artifacts?: string
    chatType: string
    chatId: string
    memoryType?: string
    sessionId?: string
    createdDate: Date
    leadEmail?: string
    action?: string | null
    followUpPrompts?: string
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
    chatId?: string
    stopNodeId?: string
    uploads?: IFileUpload[]
    leadEmail?: string
    history?: IMessage[]
    action?: IAction
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
}

export type ICredentialDataDecrypted = ICommonObject

// Plain credential object sent to server
export interface ICredentialReqBody {
    name: string
    credentialName: string
    plainDataObj: ICredentialDataDecrypted
}

// Decrypted credential object sent back to client
export interface ICredentialReturnResponse extends ICredential {
    plainDataObj: ICredentialDataDecrypted
}

export interface IUploadFileSizeAndTypes {
    fileTypes: string[]
    maxUploadSize: number
}

export interface IApiKey {
    id: string
    keyName: string
    apiKey: string
    apiSecret: string
    updatedDate: Date
}

export interface ICustomTemplate {
    id: string
    name: string
    flowData: string
    updatedDate: Date
    createdDate: Date
    description?: string
    type?: string
    badge?: string
    framework?: string
    usecases?: string
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

// DocumentStore related
export * from './Interface.DocumentStore'
