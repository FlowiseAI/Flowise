import { ICommonObject, INode, INodeData as INodeDataFromComponent, INodeParams } from 'flowise-components'

export type MessageType = 'apiMessage' | 'userMessage'

/**
 * Databases
 */
export interface IChatFlow {
    id: string
    name: string
    flowData: string
    apikeyid: string
    deployed: boolean
    updatedDate: Date
    createdDate: Date
}

export interface IChatMessage {
    id: string
    role: MessageType
    content: string
    chatflowid: string
    createdDate: Date
}

export interface IComponentNodes {
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
}

export interface IncomingInput {
    question: string
    history: IMessage[]
    overrideConfig?: ICommonObject
}

export interface IActiveChatflows {
    [key: string]: {
        startingNodes: IReactFlowNode[]
        endingNodeData: INodeData
        inSync: boolean
        overrideConfig?: ICommonObject
    }
}

export interface IOverrideConfig {
    node: string
    label: string
    name: string
    type: string
}

export interface IDatabaseExport {
    chatmessages: IChatMessage[]
    chatflows: IChatFlow[]
    apikeys: ICommonObject[]
}

export interface IRunChatflowMessageValue {
    chatflow: IChatFlow
    incomingInput: IncomingInput
    componentNodes: IComponentNodes
    endingNodeData?: INodeData
}

export interface IChildProcessMessage {
    key: string
    value?: any
}
