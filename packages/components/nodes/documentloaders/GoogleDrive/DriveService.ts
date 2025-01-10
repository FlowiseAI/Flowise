import { google } from 'googleapis'

export class DriveService {
    private oauth2Client: any
    private drive: any

    constructor(credentials: any) {
        this.oauth2Client = new google.auth.OAuth2(credentials.clientId, credentials.clientSecret, credentials.redirectUrl)

        this.oauth2Client.setCredentials({
            access_token: credentials.accessToken,
            refresh_token: credentials.refreshToken
        })

        this.drive = google.drive({
            version: 'v3',
            auth: this.oauth2Client
        })
    }

    async getFile(fileId: string): Promise<any> {
        try {
            const response = await this.drive.files.get({
                fileId,
                fields: 'id, name, mimeType, modifiedTime, webViewLink',
                supportsAllDrives: true
            })
            return response.data
        } catch (error: any) {
            console.error('Drive API Error:', error)
            if (error.code === 401) {
                await this.refreshAccessToken()
                return this.getFile(fileId)
            }
            throw error
        }
    }

    async downloadFile(fileId: string): Promise<any> {
        try {
            const file = await this.getFile(fileId)

            if (file.mimeType.includes('google-apps')) {
                let exportMimeType = 'text/plain'

                if (file.mimeType === 'application/vnd.google-apps.document') {
                    exportMimeType = 'text/plain'
                } else if (file.mimeType === 'application/vnd.google-apps.spreadsheet') {
                    exportMimeType = 'text/csv'
                } else if (file.mimeType === 'application/vnd.google-apps.presentation') {
                    exportMimeType = 'text/plain'
                }

                const response = await this.drive.files.export(
                    {
                        fileId,
                        mimeType: exportMimeType
                    },
                    {
                        responseType: 'text'
                    }
                )
                return {
                    data: response.data,
                    mimeType: exportMimeType
                }
            }

            // For binary files, convert to text
            const response = await this.drive.files.get(
                {
                    fileId,
                    alt: 'media',
                    supportsAllDrives: true
                },
                {
                    responseType: 'text'
                }
            )
            return {
                data: response.data,
                mimeType: file.mimeType
            }
        } catch (error: any) {
            console.error('Drive API Error:', error)
            if (error.code === 401) {
                await this.refreshAccessToken()
                return this.downloadFile(fileId)
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
