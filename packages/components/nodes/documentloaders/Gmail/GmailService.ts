import { google } from 'googleapis'
import { simpleParser } from 'mailparser'

export class GmailService {
    private oauth2Client: any
    private gmail: any

    constructor(credentials: any) {
        this.oauth2Client = new google.auth.OAuth2(credentials.clientId, credentials.clientSecret, credentials.redirectUrl)

        this.oauth2Client.setCredentials({
            access_token: credentials.accessToken,
            refresh_token: credentials.refreshToken
        })

        this.gmail = google.gmail({
            version: 'v1',
            auth: this.oauth2Client
        })
    }

    async getLabels(): Promise<any[]> {
        try {
            const response = await this.gmail.users.labels.list({
                userId: 'me'
            })
            return response.data.labels || []
        } catch (error: any) {
            console.error('Gmail API Error:', error)
            if (error.code === 401) {
                await this.refreshAccessToken()
                return this.getLabels()
            }
            throw error
        }
    }

    async getLabel(labelId: string): Promise<any> {
        try {
            const response = await this.gmail.users.labels.get({
                userId: 'me',
                id: labelId
            })
            return response.data
        } catch (error: any) {
            console.error('Gmail API Error:', error)
            if (error.code === 401) {
                await this.refreshAccessToken()
                return this.getLabel(labelId)
            }
            throw error
        }
    }

    async getMessagesByLabel(labelId: string, maxResults: number = 100): Promise<any[]> {
        try {
            const response = await this.gmail.users.messages.list({
                userId: 'me',
                labelIds: [labelId],
                maxResults: maxResults
            })
            return response.data.messages || []
        } catch (error: any) {
            console.error('Gmail API Error:', error)
            if (error.code === 401) {
                await this.refreshAccessToken()
                return this.getMessagesByLabel(labelId, maxResults)
            }
            throw error
        }
    }

    async getMessage(messageId: string, includeThreads: boolean = false): Promise<any> {
        try {
            const response = await this.gmail.users.messages.get({
                userId: 'me',
                id: messageId,
                format: 'raw'
            })

            const message = response.data
            const rawEmail = Buffer.from(message.raw, 'base64').toString('utf8')
            const parsedEmail = await simpleParser(rawEmail)

            // Helper function to safely extract email address text
            const getAddressText = (address: any): string => {
                if (!address) return ''
                // Handle array of addresses
                if (Array.isArray(address)) {
                    return address.map((addr) => addr.text || `${addr.name} <${addr.address}>`).join(', ')
                }
                // Handle single address
                return address.text || `${address.name} <${address.address}>`
            }

            // Define the thread item interface
            interface ThreadItem {
                id: string
                subject?: string
                from: string
                to: string
                date?: Date
                textBody?: string
                htmlBody?: string | false
            }

            const emailData = {
                id: message.id,
                threadId: message.threadId,
                subject: parsedEmail.subject,
                from: getAddressText(parsedEmail.from),
                to: getAddressText(parsedEmail.to),
                date: parsedEmail.date,
                textBody: parsedEmail.text,
                htmlBody: parsedEmail.html,
                threads: [] as ThreadItem[] // Specify the type here
            }

            // Get thread messages if requested
            if (includeThreads && message.threadId && message.threadId !== message.id) {
                const threadResponse = await this.gmail.users.threads.get({
                    userId: 'me',
                    id: message.threadId
                })

                const threadMessages = threadResponse.data.messages || []

                // Skip the current message
                const otherMessages = threadMessages.filter((m: any) => m.id !== message.id)

                for (const threadMessage of otherMessages) {
                    const threadRawEmail = Buffer.from(threadMessage.raw, 'base64').toString('utf8')
                    const threadParsedEmail = await simpleParser(threadRawEmail)

                    emailData.threads.push({
                        id: threadMessage.id,
                        subject: threadParsedEmail.subject,
                        from: getAddressText(threadParsedEmail.from),
                        to: getAddressText(threadParsedEmail.to),
                        date: threadParsedEmail.date,
                        textBody: threadParsedEmail.text,
                        htmlBody: threadParsedEmail.html
                    })
                }
            }

            return emailData
        } catch (error: any) {
            console.error('Gmail API Error:', error)
            if (error.code === 401) {
                await this.refreshAccessToken()
                return this.getMessage(messageId, includeThreads)
            }
            throw error
        }
    }

    private async refreshAccessToken() {
        try {
            const { credentials } = await this.oauth2Client.refreshAccessToken()
            this.oauth2Client.setCredentials(credentials)
            return credentials.access_token
        } catch (error) {
            throw new Error('Failed to refresh access token: ' + error.message)
        }
    }
}
