/**
 * Types
 */

export type NodeParamsType = 'options' | 'string' | 'number' | 'boolean' | 'password' | 'json' | 'code' | 'date' | 'file' | 'folder'

export type CommonType = string | number | boolean | undefined | null

export type MessageType = 'apiMessage' | 'userMessage'

/**
 * Others
 */

export interface ICommonObject {
    [key: string]: any | CommonType | ICommonObject | CommonType[] | ICommonObject[]
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
    options?: Array<INodeOptionsValue>
    optional?: boolean | INodeDisplay
    rows?: number
    list?: boolean
    acceptVariable?: boolean
    placeholder?: string
    fileType?: string
    additionalParams?: boolean
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
    category: string
    baseClasses: string[]
    description?: string
    filePath?: string
}

export interface INode extends INodeProperties {
    inputs?: INodeParams[]
    output?: INodeOutputsValue[]
    init?(nodeData: INodeData, input: string, options?: ICommonObject): Promise<any>
    run?(nodeData: INodeData, input: string, options?: ICommonObject): Promise<string>
}

export interface INodeData extends INodeProperties {
    id: string
    inputs?: ICommonObject
    outputs?: ICommonObject
    instance?: any
}

export interface IMessage {
    message: string
    type: MessageType
}

/**
 * Classes
 */

import { PromptTemplate as LangchainPromptTemplate, PromptTemplateInput } from 'langchain/prompts'

export class PromptTemplate extends LangchainPromptTemplate {
    promptValues: ICommonObject

    constructor(input: PromptTemplateInput) {
        super(input)
    }
}
