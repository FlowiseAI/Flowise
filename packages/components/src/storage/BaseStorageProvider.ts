import path from 'node:path'
import { IStorageProvider, FileInfo, StorageResult } from './IStorageProvider'
import sanitize from 'sanitize-filename'
import { getUserHome } from '../utils'
import { isPathTraversal, isValidUUID } from '../validator'
import fs from 'node:fs'

export abstract class BaseStorageProvider implements IStorageProvider {
    protected storagePath: string

    constructor() {}

    abstract getStorageType(): string
    abstract getConfig(): any
    abstract addBase64FilesToStorage(fileBase64: string, chatflowid: string, fileNames: string[], orgId: string): Promise<StorageResult>
    abstract addArrayFilesToStorage(
        mime: string,
        bf: Buffer,
        fileName: string,
        fileNames: string[],
        ...paths: string[]
    ): Promise<StorageResult>
    abstract addSingleFileToStorage(mime: string, bf: Buffer, fileName: string, ...paths: string[]): Promise<StorageResult>
    abstract getFileFromUpload(filePath: string): Promise<Buffer>
    abstract getFileFromStorage(file: string, ...paths: string[]): Promise<Buffer>
    abstract getFilesListFromStorage(...paths: string[]): Promise<FileInfo[]>
    abstract streamStorageFile(
        chatflowId: string,
        chatId: string,
        fileName: string,
        orgId: string
    ): Promise<fs.ReadStream | Buffer | undefined>
    abstract removeFilesFromStorage(...paths: string[]): Promise<StorageResult>
    abstract removeSpecificFileFromUpload(filePath: string): Promise<void>
    abstract removeSpecificFileFromStorage(...paths: string[]): Promise<StorageResult>
    abstract removeFolderFromStorage(...paths: string[]): Promise<StorageResult>
    abstract getStorageSize(orgId: string): Promise<number>
    abstract getMulterStorage(): any
    abstract getLoggerTransports(logType: 'server' | 'error' | 'requests', config?: any): any[]

    /**
     * Shared utility for sanitizing filenames to prevent path traversal and other issues
     */
    protected sanitizeFilename(filename: string): string {
        if (filename) {
            const sanitizedFilename = sanitize(filename)
            // Remove leading dots to prevent hidden files or relative path jumps
            return sanitizedFilename.replace(/^\.+/, '')
        }
        return ''
    }

    /**
     * Shared utility for getting the base storage path
     */
    protected getStoragePath(): string {
        const storagePath = process.env.BLOB_STORAGE_PATH
            ? path.join(process.env.BLOB_STORAGE_PATH)
            : path.join(getUserHome(), '.flowise', 'storage')

        if (!fs.existsSync(storagePath)) {
            fs.mkdirSync(storagePath, { recursive: true })
        }
        return storagePath
    }

    /**
     * Shared utility for validating chatflowId format (UUID)
     */
    protected validateChatflowId(chatflowId: string): void {
        if (!chatflowId || !isValidUUID(chatflowId)) {
            throw new Error('Invalid chatflowId format - must be a valid UUID')
        }
    }

    /**
     * Shared utility for checking path traversal attempts
     */
    protected validatePathSecurity(...paths: string[]): void {
        for (const p of paths) {
            if (p && isPathTraversal(p)) {
                throw new Error('Invalid path characters detected')
            }
        }
    }

    /**
     * Shared utility for building a storage path from components
     */
    protected buildPath(...paths: string[]): string {
        return path.join(this.storagePath, ...paths)
    }
}
