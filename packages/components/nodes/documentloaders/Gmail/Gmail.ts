import { INode, INodeData, INodeParams, ICommonObject } from '../../../src/Interface'
import { TextSplitter } from 'langchain/text_splitter'
import { Document } from 'langchain/document'
import { GmailService } from './GmailService'
import { omit } from 'lodash'
import { getCredentialData } from '../../../src/utils'

class Gmail implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'Gmail'
        this.name = 'gmail'
        this.version = 1.0
        this.type = 'Gmail'
        this.icon = 'gmail.svg'
        this.category = 'Document Loaders'
        this.description = 'Load emails from Gmail'
        this.baseClasses = [this.type, 'DocumentLoader']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['googleOAuth']
        }
        this.inputs = [
            {
                label: 'Selected Labels',
                name: 'selectedLabels',
                type: 'string',
                description: 'Selected label IDs from Gmail',
                optional: false
            },
            {
                label: 'Max Messages',
                name: 'maxMessages',
                type: 'number',
                description: 'Maximum number of messages to retrieve per label',
                default: 100,
                optional: true
            },
            {
                label: 'Text Splitter',
                name: 'textSplitter',
                type: 'TextSplitter',
                optional: true
            },
            {
                label: 'Include Threads',
                name: 'includeThreads',
                type: 'boolean',
                description: 'Include entire conversation threads for each email',
                default: false,
                optional: true
            },
            {
                label: 'Additional Metadata',
                name: 'metadata',
                type: 'json',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Omit Metadata Keys',
                name: 'omitMetadataKeys',
                type: 'string',
                rows: 4,
                description: 'Comma-separated metadata keys to omit. Use * to omit all except Additional Metadata',
                optional: true,
                additionalParams: true
            }
        ]
    }

    // Helper method to get credential data
    private async getCredentialData(nodeData: INodeData, options: ICommonObject): Promise<any> {
        // If the credential is a string (ID), fetch the actual credential data
        if (nodeData.credential && typeof nodeData.credential === 'string') {
            return await getCredentialData(nodeData.credential, options)
        }
        // If the credential is already an object, just return it
        if (nodeData.credential && typeof nodeData.credential === 'object') {
            return JSON.parse(nodeData.credential).plainDataObj
        }
        return null
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const textSplitter = nodeData.inputs?.textSplitter as TextSplitter
        const metadata = nodeData.inputs?.metadata
        const selectedLabels = nodeData.inputs?.selectedLabels && JSON.parse(nodeData.inputs?.selectedLabels)
        const labelIds = selectedLabels.map((label: any) => label.labelId)
        const maxMessages = (nodeData.inputs?.maxMessages as number) || 100
        const includeThreads = (nodeData.inputs?.includeThreads as boolean) || false

        // Get credential data - handle both ID and object cases
        let credentialData: any

        if (options?.appDataSource) {
            credentialData = await this.getCredentialData(nodeData, options)
        } else {
            credentialData = nodeData.credential ? JSON.parse(nodeData.credential).plainDataObj : {}
        }

        const omitMetadataKeys = nodeData.inputs?.omitMetadataKeys as string
        const _omitMetadataKeys = omitMetadataKeys === '*' ? '*' : omitMetadataKeys?.split(',')

        if (!credentialData || (typeof credentialData === 'object' && Object.keys(credentialData).length === 0)) {
            throw new Error('Credentials not found')
        }

        const credentials = {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            redirectUrl: process.env.GOOGLE_CALLBACK_URL,
            accessToken: credentialData.googleAccessToken,
            refreshToken: credentialData.googleRefreshToken,
            expiresAt: credentialData.expiresAt
        }

        const gmailService = new GmailService(credentials)
        const documents: Document[] = []

        for (const labelId of labelIds) {
            const label = await gmailService.getLabel(labelId)
            const messages = await gmailService.getMessagesByLabel(labelId, maxMessages)

            for (const message of messages) {
                const messageDetails = await gmailService.getMessage(message.id, includeThreads)
                const content = this.formatEmailContent(messageDetails)

                let docs: Document[] = [
                    new Document({
                        pageContent: content,
                        metadata:
                            _omitMetadataKeys === '*'
                                ? { ...metadata }
                                : omit(
                                      {
                                          source: `gmail://${message.id}`,
                                          messageId: message.id,
                                          threadId: message.threadId,
                                          labelId: labelId,
                                          labelName: label.name,
                                          subject: messageDetails.subject,
                                          from: messageDetails.from,
                                          to: messageDetails.to,
                                          date: messageDetails.date,
                                          ...metadata
                                      },
                                      omitMetadataKeys
                                  )
                    })
                ]

                if (textSplitter) {
                    docs = await textSplitter.splitDocuments(docs)
                }

                documents.push(...docs)
            }
        }

        return documents
    }

    async syncAndRefresh(nodeData: INodeData): Promise<any> {
        // Logic for syncing and refreshing, similar to init but with checks for new messages
        // This would be called for scheduled updates
        return this.init(nodeData, '', {})
    }

    private formatEmailContent(messageDetails: any): string {
        // Format the email content in a readable way
        let content = `Subject: ${messageDetails.subject}\n`
        content += `From: ${messageDetails.from}\n`
        content += `To: ${messageDetails.to}\n`
        content += `Date: ${messageDetails.date}\n\n`
        content += messageDetails.textBody || messageDetails.htmlBody || ''

        if (messageDetails.threads && messageDetails.threads.length > 0) {
            content += '\n\n--- THREAD ---\n\n'
            for (const thread of messageDetails.threads) {
                content += `From: ${thread.from}\n`
                content += `Date: ${thread.date}\n`
                content += thread.textBody || thread.htmlBody || ''
                content += '\n\n'
            }
        }

        return content
    }
}

module.exports = { nodeClass: Gmail }
