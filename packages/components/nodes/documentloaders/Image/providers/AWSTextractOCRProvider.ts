import { IOCRProvider, OCRProviderOptions } from './IOCRProvider'
import { getCredentialParam } from '../../../../src'

export class AWSTextractOCRProvider implements IOCRProvider {
    private client: any
    private region: string
    private accessKeyId: string
    private secretAccessKey: string

    constructor(options: OCRProviderOptions) {
        this.accessKeyId = getCredentialParam('awsKey', options.credentialData, options.nodeData)
        this.secretAccessKey = getCredentialParam('awsSecret', options.credentialData, options.nodeData)
        this.region = getCredentialParam('region', options.credentialData, options.nodeData) || getCredentialParam('awsRegion', options.credentialData, options.nodeData) || 'us-east-1'

        if (!this.accessKeyId || !this.secretAccessKey) {
            throw new Error('AWS credentials (accessKeyId and secretAccessKey) are required for AWS Textract')
        }
    }

    private async initializeClient() {
        if (this.client) {
            return
        }

        try {
            const textractModule = require('@aws-sdk/client-textract')
            const TextractClientClass = textractModule.TextractClient

            this.client = new TextractClientClass({
                region: this.region,
                credentials: {
                    accessKeyId: this.accessKeyId,
                    secretAccessKey: this.secretAccessKey
                }
            })
        } catch (error) {
            throw new Error('AWS SDK for Textract is not installed. Please install @aws-sdk/client-textract package.')
        }
    }

    async extractText(buffer: Buffer, filename: string): Promise<string> {
        try {
            await this.initializeClient()

            const textractModule = require('@aws-sdk/client-textract')
            const DetectDocumentTextCommandClass = textractModule.DetectDocumentTextCommand

            const command = new DetectDocumentTextCommandClass({
                Document: {
                    Bytes: buffer
                }
            })

            const response = await this.client.send(command)

            if (!response.Blocks) {
                return ''
            }

            const textBlocks = response.Blocks.filter((block: any) => block.BlockType === 'LINE' && block.Text)
            return textBlocks.map((block: any) => block.Text).join('\n')
        } catch (error) {
            throw new Error(`AWS Textract OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }
}

