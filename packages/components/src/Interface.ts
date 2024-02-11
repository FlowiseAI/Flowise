/**
 * Types
 */

export type NodeParamsType =
    | 'asyncOptions'
    | 'options'
    | 'multiOptions'
    | 'datagrid'
    | 'string'
    | 'number'
    | 'boolean'
    | 'password'
    | 'json'
    | 'code'
    | 'date'
    | 'file'
    | 'folder'

export type CommonType = string | number | boolean | undefined | null

export type MessageType = 'apiMessage' | 'userMessage'

/**
 * Others
 */

export interface ICommonObject {
    [key: string]: any | CommonType | ICommonObject | CommonType[] | ICommonObject[]
}

export interface IVariable {
    name: string
    value: string
    type: string
}

export type IDatabaseEntity = {
    [key: string]: any
}

export interface IAttachment {
    content: string
    contentType: string
    size?: number
    filename?: string
}

export interface INodeOptionsValue {
    label: string
    name: string
    description?: string
}

export interface INodeOutputsValue {
    label: string
    name: string
    baseClasses: string[]
    description?: string
}

export interface INodeParams {
    label: string
    name: string
    type: NodeParamsType | string
    default?: CommonType | ICommonObject | ICommonObject[]
    description?: string
    warning?: string
    options?: Array<INodeOptionsValue>
    datagrid?: Array<ICommonObject>
    credentialNames?: Array<string>
    optional?: boolean | INodeDisplay
    step?: number
    rows?: number
    list?: boolean
    acceptVariable?: boolean
    placeholder?: string
    fileType?: string
    additionalParams?: boolean
    loadMethod?: string
    hidden?: boolean
    variables?: ICommonObject[]
}

export interface INodeExecutionData {
    [key: string]: CommonType | CommonType[] | ICommonObject | ICommonObject[]
}

export interface INodeDisplay {
    [key: string]: string[] | string
}

export interface INodeProperties {
    label: string
    name: string
    type: string
    icon: string
    version: number
    category: string // TODO: use enum instead of string
    baseClasses: string[]
    tags?: string[]
    description?: string
    filePath?: string
    badge?: string
}

export interface INode extends INodeProperties {
    inputs?: INodeParams[]
    output?: INodeOutputsValue[]
    loadMethods?: {
        [key: string]: (nodeData: INodeData, options?: ICommonObject) => Promise<INodeOptionsValue[]>
    }
    vectorStoreMethods?: {
        upsert: (nodeData: INodeData, options?: ICommonObject) => Promise<void>
        search: (nodeData: INodeData, options?: ICommonObject) => Promise<any>
        delete: (nodeData: INodeData, options?: ICommonObject) => Promise<void>
    }
    init?(nodeData: INodeData, input: string, options?: ICommonObject): Promise<any>
    run?(nodeData: INodeData, input: string, options?: ICommonObject): Promise<string | ICommonObject>
}

export interface INodeData extends INodeProperties {
    id: string
    inputs?: ICommonObject
    outputs?: ICommonObject
    credential?: string
    instance?: any
    loadMethod?: string // method to load async options
}

export interface INodeCredential {
    label: string
    name: string
    description?: string
    inputs?: INodeParams[]
}

export interface IMessage {
    message: string
    type: MessageType
}

export interface IUsedTool {
    tool: string
    toolInput: object
    toolOutput: string | object
}

/**
 * Classes
 */

import { PromptTemplate as LangchainPromptTemplate, PromptTemplateInput } from 'langchain/prompts'
import { VectorStore } from 'langchain/vectorstores/base'

export class PromptTemplate extends LangchainPromptTemplate {
    promptValues: ICommonObject

    constructor(input: PromptTemplateInput) {
        super(input)
    }
}

export interface PromptRetrieverInput {
    name: string
    description: string
    systemMessage: string
}

const fixedTemplate = `Here is a question:
{input}
`
export class PromptRetriever {
    name: string
    description: string
    systemMessage: string

    constructor(fields: PromptRetrieverInput) {
        this.name = fields.name
        this.description = fields.description
        this.systemMessage = `${fields.systemMessage}\n${fixedTemplate}`
    }
}

export interface VectorStoreRetrieverInput {
    name: string
    description: string
    vectorStore: VectorStore
}

export class VectorStoreRetriever {
    name: string
    description: string
    vectorStore: VectorStore

    constructor(fields: VectorStoreRetrieverInput) {
        this.name = fields.name
        this.description = fields.description
        this.vectorStore = fields.vectorStore
    }
}

/**
 * Implement abstract classes and interface for memory
 */
import { BaseMessage } from 'langchain/schema'
import { BufferMemory, BufferWindowMemory, ConversationSummaryMemory } from 'langchain/memory'

export interface MemoryMethods {
    getChatMessages(overrideSessionId?: string, returnBaseMessages?: boolean, prevHistory?: IMessage[]): Promise<IMessage[] | BaseMessage[]>
    addChatMessages(msgArray: { text: string; type: MessageType }[], overrideSessionId?: string): Promise<void>
    clearChatMessages(overrideSessionId?: string): Promise<void>
}

export abstract class FlowiseMemory extends BufferMemory implements MemoryMethods {
    abstract getChatMessages(
        overrideSessionId?: string,
        returnBaseMessages?: boolean,
        prevHistory?: IMessage[]
    ): Promise<IMessage[] | BaseMessage[]>
    abstract addChatMessages(msgArray: { text: string; type: MessageType }[], overrideSessionId?: string): Promise<void>
    abstract clearChatMessages(overrideSessionId?: string): Promise<void>
}

export abstract class FlowiseWindowMemory extends BufferWindowMemory implements MemoryMethods {
    abstract getChatMessages(
        overrideSessionId?: string,
        returnBaseMessages?: boolean,
        prevHistory?: IMessage[]
    ): Promise<IMessage[] | BaseMessage[]>
    abstract addChatMessages(msgArray: { text: string; type: MessageType }[], overrideSessionId?: string): Promise<void>
    abstract clearChatMessages(overrideSessionId?: string): Promise<void>
}

export abstract class FlowiseSummaryMemory extends ConversationSummaryMemory implements MemoryMethods {
    abstract getChatMessages(
        overrideSessionId?: string,
        returnBaseMessages?: boolean,
        prevHistory?: IMessage[]
    ): Promise<IMessage[] | BaseMessage[]>
    abstract addChatMessages(msgArray: { text: string; type: MessageType }[], overrideSessionId?: string): Promise<void>
    abstract clearChatMessages(overrideSessionId?: string): Promise<void>
}
