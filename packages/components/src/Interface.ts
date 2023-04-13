/**
 * Types
 */

export type NodeParamsType =
    | 'asyncOptions'
    | 'options'
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
    placeholder?: string
    fileType?: string
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
    getInstance?(nodeData: INodeData): Promise<string>
    run?(nodeData: INodeData, input: string, options?: ICommonObject): Promise<string>
}

export interface INodeData extends INodeProperties {
    inputs?: ICommonObject
    instance?: any
}

export interface IMessage {
    message: string
    type: MessageType
}
