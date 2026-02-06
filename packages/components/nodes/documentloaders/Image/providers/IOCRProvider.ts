import { INodeData, ICommonObject } from '../../../../src/Interface'

export interface IOCRProvider {
    extractText(buffer: Buffer, filename: string): Promise<string>
}

export interface OCRProviderOptions {
    credentialData: ICommonObject
    nodeData: INodeData
}

export type OCRProviderConstructor = new (options: OCRProviderOptions) => IOCRProvider

