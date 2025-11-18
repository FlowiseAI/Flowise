import { z } from 'zod'
import fetch from 'node-fetch'
import { DynamicStructuredTool } from '../OpenAPIToolkit/core'
import { TOOL_ARGS_PREFIX, formatToolError } from '../../../src/agents'

export const desc = `Use this when you want to access Google Drive API for managing files and folders`

export interface Headers {
    [key: string]: string
}

export interface Body {
    [key: string]: any
}

export interface RequestParameters {
    headers?: Headers
    body?: Body
    url?: string
    description?: string
    name?: string
    actions?: string[]
    accessToken?: string
    defaultParams?: any
}

// Define schemas for different Google Drive operations

// File Schemas
const ListFilesSchema = z.object({
    pageSize: z.number().optional().default(10).describe('Maximum number of files to return (1-1000)'),
    pageToken: z.string().optional().describe('Token for next page of results'),
    orderBy: z.string().optional().describe('Sort order (name, folder, createdTime, modifiedTime, etc.)'),
    query: z.string().optional().describe('Search query (e.g., "name contains \'hello\'")'),
    spaces: z.string().optional().default('drive').describe('Spaces to search (drive, appDataFolder, photos)'),
    fields: z.string().optional().describe('Fields to include in response'),
    includeItemsFromAllDrives: z.boolean().optional().describe('Include items from all drives'),
    supportsAllDrives: z.boolean().optional().describe('Whether the requesting application supports both My Drives and shared drives')
})

const GetFileSchema = z.object({
    fileId: z.string().describe('File ID'),
    fields: z.string().optional().describe('Fields to include in response'),
    supportsAllDrives: z.boolean().optional().describe('Whether the requesting application supports both My Drives and shared drives'),
    acknowledgeAbuse: z
        .boolean()
        .optional()
        .describe('Whether the user is acknowledging the risk of downloading known malware or other abusive files')
})

const CreateFileSchema = z.object({
    name: z.string().describe('File name'),
    parents: z.string().optional().describe('Comma-separated list of parent folder IDs'),
    mimeType: z.string().optional().describe('MIME type of the file'),
    description: z.string().optional().describe('File description'),
    content: z.string().optional().describe('File content (for text files)'),
    supportsAllDrives: z.boolean().optional().describe('Whether the requesting application supports both My Drives and shared drives')
})

const UpdateFileSchema = z.object({
    fileId: z.string().describe('File ID to update'),
    name: z.string().optional().describe('New file name'),
    description: z.string().optional().describe('New file description'),
    starred: z.boolean().optional().describe('Whether the file is starred'),
    trashed: z.boolean().optional().describe('Whether the file is trashed'),
    parents: z.string().optional().describe('Comma-separated list of new parent folder IDs'),
    supportsAllDrives: z.boolean().optional().describe('Whether the requesting application supports both My Drives and shared drives')
})

const DeleteFileSchema = z.object({
    fileId: z.string().describe('File ID to delete'),
    supportsAllDrives: z.boolean().optional().describe('Whether the requesting application supports both My Drives and shared drives')
})

const CopyFileSchema = z.object({
    fileId: z.string().describe('File ID to copy'),
    name: z.string().describe('Name for the copied file'),
    parents: z.string().optional().describe('Comma-separated list of parent folder IDs for the copy'),
    supportsAllDrives: z.boolean().optional().describe('Whether the requesting application supports both My Drives and shared drives')
})

const DownloadFileSchema = z.object({
    fileId: z.string().describe('File ID to download'),
    acknowledgeAbuse: z
        .boolean()
        .optional()
        .describe('Whether the user is acknowledging the risk of downloading known malware or other abusive files'),
    supportsAllDrives: z.boolean().optional().describe('Whether the requesting application supports both My Drives and shared drives')
})

const CreateFolderSchema = z.object({
    name: z.string().describe('Folder name'),
    parents: z.string().optional().describe('Comma-separated list of parent folder IDs'),
    description: z.string().optional().describe('Folder description'),
    supportsAllDrives: z.boolean().optional().describe('Whether the requesting application supports both My Drives and shared drives')
})

const SearchFilesSchema = z.object({
    query: z.string().describe('Search query using Google Drive search syntax'),
    pageSize: z.number().optional().default(10).describe('Maximum number of files to return'),
    orderBy: z.string().optional().describe('Sort order'),
    includeItemsFromAllDrives: z.boolean().optional().describe('Include items from all drives'),
    supportsAllDrives: z.boolean().optional().describe('Whether the requesting application supports both My Drives and shared drives')
})

const ShareFileSchema = z.object({
    fileId: z.string().describe('File ID to share'),
    role: z.enum(['reader', 'writer', 'commenter', 'owner']).describe('Permission role'),
    type: z.enum(['user', 'group', 'domain', 'anyone']).describe('Permission type'),
    emailAddress: z.string().optional().describe('Email address (required for user/group types)'),
    domain: z.string().optional().describe('Domain name (required for domain type)'),
    allowFileDiscovery: z.boolean().optional().describe('Whether the file can be discovered by search'),
    sendNotificationEmail: z.boolean().optional().default(true).describe('Whether to send notification emails'),
    emailMessage: z.string().optional().describe('Custom message to include in notification email'),
    supportsAllDrives: z.boolean().optional().describe('Whether the requesting application supports both My Drives and shared drives')
})

class BaseGoogleDriveTool extends DynamicStructuredTool {
    protected accessToken: string = ''

    constructor(args: any) {
        super(args)
        this.accessToken = args.accessToken ?? ''
    }

    async makeGoogleDriveRequest({
        endpoint,
        method = 'GET',
        body,
        params
    }: {
        endpoint: string
        method?: string
        body?: any
        params?: any
    }): Promise<string> {
        const baseUrl = 'https://www.googleapis.com/drive/v3'
        const url = `${baseUrl}/${endpoint}`

        const headers: { [key: string]: string } = {
            Authorization: `Bearer ${this.accessToken}`,
            Accept: 'application/json',
            ...this.headers
        }

        if (method !== 'GET' && body) {
            headers['Content-Type'] = 'application/json'
        }

        const response = await fetch(url, {
            method,
            headers,
            body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Google Drive API Error ${response.status}: ${response.statusText} - ${errorText}`)
        }

        const data = await response.text()
        return data + TOOL_ARGS_PREFIX + JSON.stringify(params)
    }
}

// File Tools
class ListFilesTool extends BaseGoogleDriveTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'list_files',
            description: 'List files and folders from Google Drive',
            schema: ListFilesSchema,
            baseUrl: '',
            method: 'GET',
            headers: {}
        }
        super({
            ...toolInput,
            accessToken: args.accessToken
        })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const queryParams = new URLSearchParams()

        if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString())
        if (params.pageToken) queryParams.append('pageToken', params.pageToken)
        if (params.orderBy) queryParams.append('orderBy', params.orderBy)
        if (params.query) queryParams.append('q', params.query)
        if (params.spaces) queryParams.append('spaces', params.spaces)
        if (params.fields) queryParams.append('fields', params.fields)
        if (params.includeItemsFromAllDrives) queryParams.append('includeItemsFromAllDrives', params.includeItemsFromAllDrives.toString())
        if (params.supportsAllDrives) queryParams.append('supportsAllDrives', params.supportsAllDrives.toString())

        const endpoint = `files?${queryParams.toString()}`

        try {
            const response = await this.makeGoogleDriveRequest({ endpoint, params })
            return response
        } catch (error) {
            return formatToolError(`Error listing files: ${error}`, params)
        }
    }
}

class GetFileTool extends BaseGoogleDriveTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'get_file',
            description: 'Get file metadata from Google Drive',
            schema: GetFileSchema,
            baseUrl: '',
            method: 'GET',
            headers: {}
        }
        super({
            ...toolInput,
            accessToken: args.accessToken
        })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const queryParams = new URLSearchParams()

        if (params.fields) queryParams.append('fields', params.fields)
        if (params.supportsAllDrives) queryParams.append('supportsAllDrives', params.supportsAllDrives.toString())
        if (params.acknowledgeAbuse) queryParams.append('acknowledgeAbuse', params.acknowledgeAbuse.toString())

        const endpoint = `files/${encodeURIComponent(params.fileId)}?${queryParams.toString()}`

        try {
            const response = await this.makeGoogleDriveRequest({ endpoint, params })
            return response
        } catch (error) {
            return formatToolError(`Error getting file: ${error}`, params)
        }
    }
}

class CreateFileTool extends BaseGoogleDriveTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'create_file',
            description: 'Create a new file in Google Drive',
            schema: CreateFileSchema,
            baseUrl: '',
            method: 'POST',
            headers: {}
        }
        super({
            ...toolInput,
            accessToken: args.accessToken
        })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            // Validate required parameters
            if (!params.name) {
                throw new Error('File name is required')
            }

            const queryParams = new URLSearchParams()
            if (params.supportsAllDrives) queryParams.append('supportsAllDrives', params.supportsAllDrives.toString())

            // Prepare metadata
            const fileMetadata: any = {
                name: params.name
            }

            if (params.parents) {
                // Validate parent folder IDs format
                const parentIds = params.parents
                    .split(',')
                    .map((p: string) => p.trim())
                    .filter((p: string) => p.length > 0)
                if (parentIds.length > 0) {
                    fileMetadata.parents = parentIds
                }
            }
            if (params.mimeType) fileMetadata.mimeType = params.mimeType
            if (params.description) fileMetadata.description = params.description

            // Determine upload type based on content and metadata
            if (!params.content) {
                // Metadata-only upload (no file content) - standard endpoint
                const endpoint = `files?${queryParams.toString()}`
                const response = await this.makeGoogleDriveRequest({
                    endpoint,
                    method: 'POST',
                    body: fileMetadata,
                    params
                })
                return response
            } else {
                // Validate content
                if (typeof params.content !== 'string') {
                    throw new Error('File content must be a string')
                }

                // Check if we have metadata beyond just the name
                const hasAdditionalMetadata = params.parents || params.description || params.mimeType

                if (!hasAdditionalMetadata) {
                    // Simple upload (uploadType=media) - only file content, basic metadata
                    return await this.performSimpleUpload(params, queryParams)
                } else {
                    // Multipart upload (uploadType=multipart) - file content + metadata
                    return await this.performMultipartUpload(params, fileMetadata, queryParams)
                }
            }
        } catch (error) {
            return formatToolError(`Error creating file: ${error}`, params)
        }
    }

    private async performSimpleUpload(params: any, queryParams: URLSearchParams): Promise<string> {
        // Simple upload: POST https://www.googleapis.com/upload/drive/v3/files?uploadType=media
        queryParams.append('uploadType', 'media')
        const url = `https://www.googleapis.com/upload/drive/v3/files?${queryParams.toString()}`

        const headers: { [key: string]: string } = {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': params.mimeType || 'application/octet-stream',
            'Content-Length': Buffer.byteLength(params.content, 'utf8').toString()
        }

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: params.content
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Google Drive API Error ${response.status}: ${response.statusText} - ${errorText}`)
        }

        const data = await response.text()
        return data + TOOL_ARGS_PREFIX + JSON.stringify(params)
    }

    private async performMultipartUpload(params: any, fileMetadata: any, queryParams: URLSearchParams): Promise<string> {
        // Multipart upload: POST https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart
        queryParams.append('uploadType', 'multipart')
        const url = `https://www.googleapis.com/upload/drive/v3/files?${queryParams.toString()}`

        // Create multipart/related body according to RFC 2387
        const boundary = '-------314159265358979323846'

        // Build multipart body - RFC 2387 format
        let body = `--${boundary}\r\n`

        // Part 1: Metadata (application/json; charset=UTF-8)
        body += 'Content-Type: application/json; charset=UTF-8\r\n\r\n'
        body += JSON.stringify(fileMetadata) + '\r\n'

        // Part 2: Media content (any MIME type)
        body += `--${boundary}\r\n`
        body += `Content-Type: ${params.mimeType || 'application/octet-stream'}\r\n\r\n`
        body += params.content + '\r\n'

        // Close boundary
        body += `--${boundary}--`

        const headers: { [key: string]: string } = {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': `multipart/related; boundary="${boundary}"`,
            'Content-Length': Buffer.byteLength(body, 'utf8').toString()
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: body
            })

            if (!response.ok) {
                const errorText = await response.text()
                console.error('Multipart upload failed:', {
                    url,
                    headers: { ...headers, Authorization: '[REDACTED]' },
                    metadata: fileMetadata,
                    contentLength: params.content?.length || 0,
                    error: errorText
                })
                throw new Error(`Google Drive API Error ${response.status}: ${response.statusText} - ${errorText}`)
            }

            const data = await response.text()
            return data + TOOL_ARGS_PREFIX + JSON.stringify(params)
        } catch (error) {
            throw new Error(`Multipart upload failed: ${error}`)
        }
    }
}

class UpdateFileTool extends BaseGoogleDriveTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'update_file',
            description: 'Update file metadata in Google Drive',
            schema: UpdateFileSchema,
            baseUrl: '',
            method: 'PATCH',
            headers: {}
        }
        super({
            ...toolInput,
            accessToken: args.accessToken
        })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            const updateData: any = {}

            if (params.name) updateData.name = params.name
            if (params.description) updateData.description = params.description
            if (params.starred !== undefined) updateData.starred = params.starred
            if (params.trashed !== undefined) updateData.trashed = params.trashed

            const queryParams = new URLSearchParams()
            if (params.supportsAllDrives) queryParams.append('supportsAllDrives', params.supportsAllDrives.toString())

            const endpoint = `files/${encodeURIComponent(params.fileId)}?${queryParams.toString()}`

            const response = await this.makeGoogleDriveRequest({
                endpoint,
                method: 'PATCH',
                body: updateData,
                params
            })
            return response
        } catch (error) {
            return formatToolError(`Error updating file: ${error}`, params)
        }
    }
}

class DeleteFileTool extends BaseGoogleDriveTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'delete_file',
            description: 'Delete a file from Google Drive',
            schema: DeleteFileSchema,
            baseUrl: '',
            method: 'DELETE',
            headers: {}
        }
        super({
            ...toolInput,
            accessToken: args.accessToken
        })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            const queryParams = new URLSearchParams()
            if (params.supportsAllDrives) queryParams.append('supportsAllDrives', params.supportsAllDrives.toString())

            const endpoint = `files/${encodeURIComponent(params.fileId)}?${queryParams.toString()}`

            await this.makeGoogleDriveRequest({
                endpoint,
                method: 'DELETE',
                params
            })
            return `File deleted successfully`
        } catch (error) {
            return formatToolError(`Error deleting file: ${error}`, params)
        }
    }
}

class CopyFileTool extends BaseGoogleDriveTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'copy_file',
            description: 'Copy a file in Google Drive',
            schema: CopyFileSchema,
            baseUrl: '',
            method: 'POST',
            headers: {}
        }
        super({
            ...toolInput,
            accessToken: args.accessToken
        })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            const copyData: any = {
                name: params.name
            }

            if (params.parents) {
                copyData.parents = params.parents.split(',').map((p: string) => p.trim())
            }

            const queryParams = new URLSearchParams()
            if (params.supportsAllDrives) queryParams.append('supportsAllDrives', params.supportsAllDrives.toString())

            const endpoint = `files/${encodeURIComponent(params.fileId)}/copy?${queryParams.toString()}`

            const response = await this.makeGoogleDriveRequest({
                endpoint,
                method: 'POST',
                body: copyData,
                params
            })
            return response
        } catch (error) {
            return formatToolError(`Error copying file: ${error}`, params)
        }
    }
}

class DownloadFileTool extends BaseGoogleDriveTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'download_file',
            description: 'Download a file from Google Drive',
            schema: DownloadFileSchema,
            baseUrl: '',
            method: 'GET',
            headers: {}
        }
        super({
            ...toolInput,
            accessToken: args.accessToken
        })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            const queryParams = new URLSearchParams()
            queryParams.append('alt', 'media')
            if (params.acknowledgeAbuse) queryParams.append('acknowledgeAbuse', params.acknowledgeAbuse.toString())
            if (params.supportsAllDrives) queryParams.append('supportsAllDrives', params.supportsAllDrives.toString())

            const endpoint = `files/${encodeURIComponent(params.fileId)}?${queryParams.toString()}`

            const response = await this.makeGoogleDriveRequest({ endpoint, params })
            return response
        } catch (error) {
            return formatToolError(`Error downloading file: ${error}`, params)
        }
    }
}

class CreateFolderTool extends BaseGoogleDriveTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'create_folder',
            description: 'Create a new folder in Google Drive',
            schema: CreateFolderSchema,
            baseUrl: '',
            method: 'POST',
            headers: {}
        }
        super({
            ...toolInput,
            accessToken: args.accessToken
        })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            const folderData: any = {
                name: params.name,
                mimeType: 'application/vnd.google-apps.folder'
            }

            if (params.parents) {
                folderData.parents = params.parents.split(',').map((p: string) => p.trim())
            }
            if (params.description) folderData.description = params.description

            const queryParams = new URLSearchParams()
            if (params.supportsAllDrives) queryParams.append('supportsAllDrives', params.supportsAllDrives.toString())

            const endpoint = `files?${queryParams.toString()}`

            const response = await this.makeGoogleDriveRequest({
                endpoint,
                method: 'POST',
                body: folderData,
                params
            })
            return response
        } catch (error) {
            return formatToolError(`Error creating folder: ${error}`, params)
        }
    }
}

class SearchFilesTool extends BaseGoogleDriveTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'search_files',
            description: 'Search files in Google Drive',
            schema: SearchFilesSchema,
            baseUrl: '',
            method: 'GET',
            headers: {}
        }
        super({
            ...toolInput,
            accessToken: args.accessToken
        })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            const queryParams = new URLSearchParams()
            queryParams.append('q', params.query)
            if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString())
            if (params.orderBy) queryParams.append('orderBy', params.orderBy)
            if (params.includeItemsFromAllDrives)
                queryParams.append('includeItemsFromAllDrives', params.includeItemsFromAllDrives.toString())
            if (params.supportsAllDrives) queryParams.append('supportsAllDrives', params.supportsAllDrives.toString())

            const endpoint = `files?${queryParams.toString()}`

            const response = await this.makeGoogleDriveRequest({ endpoint, params })
            return response
        } catch (error) {
            return formatToolError(`Error searching files: ${error}`, params)
        }
    }
}

class ShareFileTool extends BaseGoogleDriveTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'share_file',
            description: 'Share a file in Google Drive',
            schema: ShareFileSchema,
            baseUrl: '',
            method: 'POST',
            headers: {}
        }
        super({
            ...toolInput,
            accessToken: args.accessToken
        })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            const permissionData: any = {
                role: params.role,
                type: params.type
            }

            if (params.emailAddress) permissionData.emailAddress = params.emailAddress
            if (params.domain) permissionData.domain = params.domain
            if (params.allowFileDiscovery !== undefined) permissionData.allowFileDiscovery = params.allowFileDiscovery

            const queryParams = new URLSearchParams()
            if (params.sendNotificationEmail !== undefined)
                queryParams.append('sendNotificationEmail', params.sendNotificationEmail.toString())
            if (params.emailMessage) queryParams.append('emailMessage', params.emailMessage)
            if (params.supportsAllDrives) queryParams.append('supportsAllDrives', params.supportsAllDrives.toString())

            const endpoint = `files/${encodeURIComponent(params.fileId)}/permissions?${queryParams.toString()}`

            const response = await this.makeGoogleDriveRequest({
                endpoint,
                method: 'POST',
                body: permissionData,
                params
            })
            return response
        } catch (error) {
            return formatToolError(`Error sharing file: ${error}`, params)
        }
    }
}

class ListFolderContentsTool extends BaseGoogleDriveTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'list_folder_contents',
            description: 'List contents of a specific folder in Google Drive',
            schema: z.object({
                folderId: z.string().describe('Folder ID to list contents from'),
                pageSize: z.number().optional().default(10).describe('Maximum number of files to return'),
                orderBy: z.string().optional().describe('Sort order'),
                includeItemsFromAllDrives: z.boolean().optional().describe('Include items from all drives'),
                supportsAllDrives: z
                    .boolean()
                    .optional()
                    .describe('Whether the requesting application supports both My Drives and shared drives')
            }),
            baseUrl: '',
            method: 'GET',
            headers: {}
        }
        super({
            ...toolInput,
            accessToken: args.accessToken
        })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            const queryParams = new URLSearchParams()
            queryParams.append('q', `'${params.folderId}' in parents`)
            if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString())
            if (params.orderBy) queryParams.append('orderBy', params.orderBy)
            if (params.includeItemsFromAllDrives)
                queryParams.append('includeItemsFromAllDrives', params.includeItemsFromAllDrives.toString())
            if (params.supportsAllDrives) queryParams.append('supportsAllDrives', params.supportsAllDrives.toString())

            const endpoint = `files?${queryParams.toString()}`

            const response = await this.makeGoogleDriveRequest({ endpoint, params })
            return response
        } catch (error) {
            return formatToolError(`Error listing folder contents: ${error}`, params)
        }
    }
}

class DeleteFolderTool extends BaseGoogleDriveTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'delete_folder',
            description: 'Delete a folder from Google Drive',
            schema: z.object({
                folderId: z.string().describe('Folder ID to delete'),
                supportsAllDrives: z
                    .boolean()
                    .optional()
                    .describe('Whether the requesting application supports both My Drives and shared drives')
            }),
            baseUrl: '',
            method: 'DELETE',
            headers: {}
        }
        super({
            ...toolInput,
            accessToken: args.accessToken
        })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            const queryParams = new URLSearchParams()
            if (params.supportsAllDrives) queryParams.append('supportsAllDrives', params.supportsAllDrives.toString())

            const endpoint = `files/${encodeURIComponent(params.folderId)}?${queryParams.toString()}`

            await this.makeGoogleDriveRequest({
                endpoint,
                method: 'DELETE',
                params
            })
            return `Folder deleted successfully`
        } catch (error) {
            return formatToolError(`Error deleting folder: ${error}`, params)
        }
    }
}

class GetPermissionsTool extends BaseGoogleDriveTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'get_permissions',
            description: 'Get permissions for a file in Google Drive',
            schema: z.object({
                fileId: z.string().describe('File ID to get permissions for'),
                supportsAllDrives: z
                    .boolean()
                    .optional()
                    .describe('Whether the requesting application supports both My Drives and shared drives')
            }),
            baseUrl: '',
            method: 'GET',
            headers: {}
        }
        super({
            ...toolInput,
            accessToken: args.accessToken
        })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            const queryParams = new URLSearchParams()
            if (params.supportsAllDrives) queryParams.append('supportsAllDrives', params.supportsAllDrives.toString())

            const endpoint = `files/${encodeURIComponent(params.fileId)}/permissions?${queryParams.toString()}`

            const response = await this.makeGoogleDriveRequest({ endpoint, params })
            return response
        } catch (error) {
            return formatToolError(`Error getting permissions: ${error}`, params)
        }
    }
}

class RemovePermissionTool extends BaseGoogleDriveTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'remove_permission',
            description: 'Remove a permission from a file in Google Drive',
            schema: z.object({
                fileId: z.string().describe('File ID to remove permission from'),
                permissionId: z.string().describe('Permission ID to remove'),
                supportsAllDrives: z
                    .boolean()
                    .optional()
                    .describe('Whether the requesting application supports both My Drives and shared drives')
            }),
            baseUrl: '',
            method: 'DELETE',
            headers: {}
        }
        super({
            ...toolInput,
            accessToken: args.accessToken
        })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            const queryParams = new URLSearchParams()
            if (params.supportsAllDrives) queryParams.append('supportsAllDrives', params.supportsAllDrives.toString())

            const endpoint = `files/${encodeURIComponent(params.fileId)}/permissions/${encodeURIComponent(
                params.permissionId
            )}?${queryParams.toString()}`

            await this.makeGoogleDriveRequest({
                endpoint,
                method: 'DELETE',
                params
            })
            return `Permission removed successfully`
        } catch (error) {
            return formatToolError(`Error removing permission: ${error}`, params)
        }
    }
}

export const createGoogleDriveTools = (args?: RequestParameters): DynamicStructuredTool[] => {
    const tools: DynamicStructuredTool[] = []
    const actions = args?.actions || []
    const accessToken = args?.accessToken || ''
    const defaultParams = args?.defaultParams || {}

    if (actions.includes('listFiles')) {
        tools.push(new ListFilesTool({ accessToken, defaultParams }))
    }

    if (actions.includes('getFile')) {
        tools.push(new GetFileTool({ accessToken, defaultParams }))
    }

    if (actions.includes('createFile')) {
        tools.push(new CreateFileTool({ accessToken, defaultParams }))
    }

    if (actions.includes('updateFile')) {
        tools.push(new UpdateFileTool({ accessToken, defaultParams }))
    }

    if (actions.includes('deleteFile')) {
        tools.push(new DeleteFileTool({ accessToken, defaultParams }))
    }

    if (actions.includes('copyFile')) {
        tools.push(new CopyFileTool({ accessToken, defaultParams }))
    }

    if (actions.includes('downloadFile')) {
        tools.push(new DownloadFileTool({ accessToken, defaultParams }))
    }

    if (actions.includes('createFolder')) {
        tools.push(new CreateFolderTool({ accessToken, defaultParams }))
    }

    if (actions.includes('listFolderContents')) {
        tools.push(new ListFolderContentsTool({ accessToken, defaultParams }))
    }

    if (actions.includes('deleteFolder')) {
        tools.push(new DeleteFolderTool({ accessToken, defaultParams }))
    }

    if (actions.includes('searchFiles')) {
        tools.push(new SearchFilesTool({ accessToken, defaultParams }))
    }

    if (actions.includes('shareFile')) {
        tools.push(new ShareFileTool({ accessToken, defaultParams }))
    }

    if (actions.includes('getPermissions')) {
        tools.push(new GetPermissionsTool({ accessToken, defaultParams }))
    }

    if (actions.includes('removePermission')) {
        tools.push(new RemovePermissionTool({ accessToken, defaultParams }))
    }

    return tools
}
