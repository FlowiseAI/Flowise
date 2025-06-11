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
                fields: 'id, name, mimeType, modifiedTime, webViewLink, parents, shared, driveId',
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

            // Handle Google Workspace native files (always export as text)
            if (file.mimeType.includes('google-apps')) {
                return this.exportGoogleWorkspaceFile(fileId, file.mimeType)
            }

            // Handle Microsoft Office files (try export first, fallback to binary)
            if (this.isMicrosoftOfficeFile(file.mimeType)) {
                return this.downloadMicrosoftOfficeFile(fileId, file.mimeType)
            }

            // For all other files, download as binary
            return this.downloadBinaryFile(fileId, file.mimeType)
        } catch (error: any) {
            console.error('Drive API Error:', error)
            if (error.code === 401) {
                await this.refreshAccessToken()
                return this.downloadFile(fileId)
            }
            throw error
        }
    }

    private async exportGoogleWorkspaceFile(fileId: string, mimeType: string): Promise<any> {
        let exportMimeType = 'text/plain'

        if (mimeType === 'application/vnd.google-apps.document') {
            exportMimeType = 'text/plain'
        } else if (mimeType === 'application/vnd.google-apps.spreadsheet') {
            exportMimeType = 'text/csv'
        } else if (mimeType === 'application/vnd.google-apps.presentation') {
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

    private async downloadMicrosoftOfficeFile(fileId: string, originalMimeType: string): Promise<any> {
        // Determine the export format based on file type
        const exportMapping: Record<string, string> = {
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'text/plain',
            'application/msword': 'text/plain',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'text/csv',
            'application/vnd.ms-excel': 'text/csv',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'text/plain',
            'application/vnd.ms-powerpoint': 'text/plain'
        }

        const exportMimeType = exportMapping[originalMimeType]

        if (exportMimeType) {
            try {
                // Try to export the Office file as text/CSV
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
            } catch (exportError) {
                console.warn(`Could not export ${originalMimeType} as ${exportMimeType}, downloading as binary:`, exportError)
            }
        }

        // Fallback to binary download
        return this.downloadBinaryFile(fileId, originalMimeType)
    }

    private async downloadBinaryFile(fileId: string, mimeType: string): Promise<any> {
        const response = await this.drive.files.get(
            {
                fileId,
                alt: 'media',
                supportsAllDrives: true
            },
            {
                responseType: 'arraybuffer'
            }
        )

        // Convert binary data to base64
        const buffer = Buffer.from(response.data)
        const base64Data = buffer.toString('base64')

        return {
            data: base64Data,
            mimeType: mimeType
        }
    }

    private isMicrosoftOfficeFile(mimeType: string): boolean {
        const officeMimeTypes = [
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/vnd.ms-powerpoint'
        ]
        return officeMimeTypes.includes(mimeType)
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

    async listFiles(folderId?: string, pageToken?: string): Promise<any> {
        try {
            const query = folderId ? `'${folderId}' in parents` : undefined

            const response = await this.drive.files.list({
                q: query,
                fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, webViewLink, parents, shared, driveId)',
                pageToken,
                pageSize: 100,
                supportsAllDrives: true,
                includeItemsFromAllDrives: true
            })
            return response.data
        } catch (error: any) {
            console.error('Drive API Error:', error)
            if (error.code === 401) {
                await this.refreshAccessToken()
                return this.listFiles(folderId, pageToken)
            }
            throw error
        }
    }

    async listSharedDrives(): Promise<any> {
        try {
            const response = await this.drive.drives.list({
                fields: 'drives(id, name)'
            })
            return response.data
        } catch (error: any) {
            console.error('Drive API Error:', error)
            if (error.code === 401) {
                await this.refreshAccessToken()
                return this.listSharedDrives()
            }
            throw error
        }
    }

    async getFolderContents(folderId: string): Promise<any> {
        try {
            const response = await this.drive.files.list({
                q: `'${folderId}' in parents`,
                fields: 'files(id, name, mimeType, modifiedTime, webViewLink, parents, shared, driveId)',
                supportsAllDrives: true,
                includeItemsFromAllDrives: true
            })
            return response.data
        } catch (error: any) {
            console.error('Drive API Error:', error)
            if (error.code === 401) {
                await this.refreshAccessToken()
                return this.getFolderContents(folderId)
            }
            throw error
        }
    }

    async listSharedWithMeFiles(): Promise<any> {
        try {
            const response = await this.drive.files.list({
                q: 'sharedWithMe',
                fields: 'files(id, name, mimeType, modifiedTime, webViewLink, parents, shared, driveId)',
                supportsAllDrives: true,
                includeItemsFromAllDrives: true
            })
            return response.data
        } catch (error: any) {
            console.error('Drive API Error:', error)
            if (error.code === 401) {
                await this.refreshAccessToken()
                return this.listSharedWithMeFiles()
            }
            throw error
        }
    }
}
