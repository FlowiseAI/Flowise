import fs from 'node:fs'

export interface FileInfo {
    name: string
    path: string
    size: number
}

export interface StorageResult {
    path: string
    totalSize: number
}

export interface StorageSizeResult {
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
    removeFilesFromStorage(...paths: string[]): Promise<StorageSizeResult>

    /**
     * Remove a specific file from the upload directory
     */
    removeSpecificFileFromUpload(filePath: string): Promise<void>

    /**
     * Remove a specific file from storage
     */
    removeSpecificFileFromStorage(...paths: string[]): Promise<StorageSizeResult>

    /**
     * Remove a complete folder and its contents from storage
     */
    removeFolderFromStorage(...paths: string[]): Promise<StorageSizeResult>

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
    getLoggerTransports(logType: 'server' | 'error' | 'requests' | 'audit', config?: any): any[]

    // -------------------------------------------------------------------------
    // Raw blob primitives.
    //
    // These bypass the chatflow-shaped accounting in the methods above (notably
    // the org-wide `getStorageSize` enumeration that runs after every write or
    // delete) and the orgId-migration fallback inside `getFileFromStorage`.
    // They are the right surface for fine-grained, per-asset workloads such as
    // the Skill storage layer.
    // -------------------------------------------------------------------------

    /**
     * Write (or overwrite) a single blob at the given path. No size enumeration,
     * no fileNames mutation, no pre-delete.
     */
    writeBlob(buffer: Buffer, mime: string, ...paths: string[]): Promise<void>

    /**
     * Read a blob from storage. Returns `null` on a real not-found
     * (S3 NoSuchKey / 404, GCS 404, Azure BlobNotFound, ENOENT). Throws on
     * every other error so callers can distinguish "missing" from "transient
     * outage".
     */
    readBlob(...paths: string[]): Promise<Buffer | null>

    /**
     * Delete a single blob. Idempotent — no-op when the blob is missing.
     */
    deleteBlob(...paths: string[]): Promise<void>

    /**
     * Recursive prefix delete. Idempotent. No size enumeration.
     */
    deleteBlobFolder(...paths: string[]): Promise<void>

    /**
     * Cheap existence check using HEAD/exists primitives. Does not fetch the
     * body.
     */
    blobExists(...paths: string[]): Promise<boolean>
}
