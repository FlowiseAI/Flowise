import fs from 'fs'
import path from 'path'
import { getUserHome } from './utils'
import { StorageProviderFactory, StorageResult, StorageSizeResult, FileInfo } from './storage'

export const addBase64FilesToStorage = async (
    fileBase64: string,
    chatflowid: string,
    fileNames: string[],
    orgId: string
): Promise<StorageResult> => {
    const provider = StorageProviderFactory.getProvider()
    return provider.addBase64FilesToStorage(fileBase64, chatflowid, fileNames, orgId)
}

export const addArrayFilesToStorage = async (
    mime: string,
    bf: Buffer,
    fileName: string,
    fileNames: string[],
    ...paths: string[]
): Promise<StorageResult> => {
    const provider = StorageProviderFactory.getProvider()
    return provider.addArrayFilesToStorage(mime, bf, fileName, fileNames, ...paths)
}

export const addSingleFileToStorage = async (mime: string, bf: Buffer, fileName: string, ...paths: string[]): Promise<StorageResult> => {
    const provider = StorageProviderFactory.getProvider()
    return provider.addSingleFileToStorage(mime, bf, fileName, ...paths)
}

export const getFileFromUpload = async (filePath: string): Promise<Buffer> => {
    const provider = StorageProviderFactory.getProvider()
    return provider.getFileFromUpload(filePath)
}

export const getFileFromStorage = async (file: string, ...paths: string[]): Promise<Buffer> => {
    const provider = StorageProviderFactory.getProvider()
    return provider.getFileFromStorage(file, ...paths)
}

export const getFilesListFromStorage = async (...paths: string[]): Promise<FileInfo[]> => {
    const provider = StorageProviderFactory.getProvider()
    return provider.getFilesListFromStorage(...paths)
}

/**
 * Prepare storage path
 */
export const getStoragePath = (): string => {
    const storagePath = process.env.BLOB_STORAGE_PATH
        ? path.join(process.env.BLOB_STORAGE_PATH)
        : path.join(getUserHome(), '.flowise', 'storage')
    if (!fs.existsSync(storagePath)) {
        fs.mkdirSync(storagePath, { recursive: true })
    }
    return storagePath
}

/**
 * Get the storage type - local or cloud
 */
export const getStorageType = (): string => {
    return process.env.STORAGE_TYPE ? process.env.STORAGE_TYPE : 'local'
}

export const removeFilesFromStorage = async (...paths: string[]): Promise<StorageSizeResult> => {
    const provider = StorageProviderFactory.getProvider()
    return provider.removeFilesFromStorage(...paths)
}

export const removeSpecificFileFromUpload = async (filePath: string): Promise<void> => {
    const provider = StorageProviderFactory.getProvider()
    return provider.removeSpecificFileFromUpload(filePath)
}

export const removeSpecificFileFromStorage = async (...paths: string[]): Promise<StorageSizeResult> => {
    const provider = StorageProviderFactory.getProvider()
    return provider.removeSpecificFileFromStorage(...paths)
}

export const removeFolderFromStorage = async (...paths: string[]): Promise<StorageSizeResult> => {
    const provider = StorageProviderFactory.getProvider()
    return provider.removeFolderFromStorage(...paths)
}

export const streamStorageFile = async (
    chatflowId: string,
    chatId: string,
    fileName: string,
    orgId: string
): Promise<fs.ReadStream | Buffer | undefined> => {
    const provider = StorageProviderFactory.getProvider()
    return provider.streamStorageFile(chatflowId, chatId, fileName, orgId)
}

/**
 * Get the total storage size for an organization (unified across all providers)
 */
export const getStorageSize = async (orgId: string): Promise<number> => {
    const provider = StorageProviderFactory.getProvider()
    return provider.getStorageSize(orgId)
}
