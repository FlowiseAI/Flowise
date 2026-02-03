import fs from 'node:fs'

export interface FileInfo {
    name: string
    path: string
    size: number
}

export interface StorageResult {
    // path is optional as some functions only return totalSize
    path?: string
    totalSize: number
}

export interface IStorageProvider {
    /**
     * Get the storage type (e.g., 'local', 's3', 'gcs', 'azure')
     */
    getStorageType(): string

    /**
     * Get the provider configuration
     */
    getConfig(): any

    /**
     * Add files provided as base64 strings to storage
     */
    addBase64FilesToStorage(fileBase64: string, chatflowid: string, fileNames: string[], orgId: string): Promise<StorageResult>

    /**
     * Add file buffer to storage as part of an array
     */
    addArrayFilesToStorage(mime: string, bf: Buffer, fileName: string, fileNames: string[], ...paths: string[]): Promise<StorageResult>

    /**
     * Add a single file buffer to storage
     */
    addSingleFileToStorage(mime: string, bf: Buffer, fileName: string, ...paths: string[]): Promise<StorageResult>

    /**
     * Retrieve a file from the upload directory
     */
    getFileFromUpload(filePath: string): Promise<Buffer>

    /**
     * Retrieve a file from generic storage
     */
    getFileFromStorage(file: string, ...paths: string[]): Promise<Buffer>

    /**
     * List files in a storage path
     */
    getFilesListFromStorage(...paths: string[]): Promise<FileInfo[]>

    /**
     * Stream a file from storage
     */
    streamStorageFile(chatflowId: string, chatId: string, fileName: string, orgId: string): Promise<fs.ReadStream | Buffer | undefined>

    /**
     * Remove multiple files from storage
     */
    removeFilesFromStorage(...paths: string[]): Promise<StorageResult>

    /**
     * Remove a specific file from the upload directory
     */
    removeSpecificFileFromUpload(filePath: string): Promise<void>

    /**
     * Remove a specific file from storage
     */
    removeSpecificFileFromStorage(...paths: string[]): Promise<StorageResult>

    /**
     * Remove a complete folder and its contents from storage
     */
    removeFolderFromStorage(...paths: string[]): Promise<StorageResult>

    /**
     * Calculate the total storage size for an organization
     */
    getStorageSize(orgId: string): Promise<number>

    /**
     * Get the Multer storage engine for this provider
     */
    getMulterStorage(): any

    /**
     * Get the Winston logger transports for this provider
     */
    getLoggerTransports(logType: 'server' | 'error' | 'requests', config?: any): any[]
}
