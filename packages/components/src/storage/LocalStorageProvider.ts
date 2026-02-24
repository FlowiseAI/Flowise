import path from 'node:path'
import fs from 'fs'
import multer from 'multer'
import DailyRotateFile from 'winston-daily-rotate-file'
import { transports } from 'winston'
import { BaseStorageProvider } from './BaseStorageProvider'
import { FileInfo, StorageResult, StorageSizeResult } from './IStorageProvider'

export class LocalStorageProvider extends BaseStorageProvider {
    constructor() {
        super()
    }

    getStorageType(): string {
        return 'local'
    }

    getConfig(): any {
        return {
            storagePath: this.storagePath
        }
    }

    async addBase64FilesToStorage(fileBase64: string, chatflowid: string, fileNames: string[], orgId: string): Promise<StorageResult> {
        // Validate chatflowid
        this.validateChatflowId(chatflowid)
        this.validatePathSecurity(chatflowid)

        const dir = this.buildPath(orgId, chatflowid)
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
        }

        const splitDataURI = fileBase64.split(',')
        const filename = splitDataURI.pop()?.split(':')[1] ?? ''
        const bf = Buffer.from(splitDataURI.pop() || '', 'base64')
        const sanitizedFilename = this.sanitizeFilename(filename)

        const filePath = path.join(dir, sanitizedFilename)
        fs.writeFileSync(filePath, bf)
        fileNames.push(sanitizedFilename)

        const totalSize = await this.getStorageSize(orgId)
        return { path: 'FILE-STORAGE::' + JSON.stringify(fileNames), totalSize: totalSize / 1024 / 1024 }
    }

    async addArrayFilesToStorage(
        mime: string,
        bf: Buffer,
        fileName: string,
        fileNames: string[],
        ...paths: string[]
    ): Promise<StorageResult> {
        const dir = this.buildPath(...paths)
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
        }
        const sanitizedFilename = this.sanitizeFilename(fileName)
        const filePath = path.join(dir, sanitizedFilename)
        fs.writeFileSync(filePath, bf)
        fileNames.push(sanitizedFilename)

        const totalSize = await this.getStorageSize(paths[0])
        return { path: 'FILE-STORAGE::' + JSON.stringify(fileNames), totalSize: totalSize / 1024 / 1024 }
    }

    async addSingleFileToStorage(mime: string, bf: Buffer, fileName: string, ...paths: string[]): Promise<StorageResult> {
        const dir = this.buildPath(...paths)
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
        }
        const sanitizedFilename = this.sanitizeFilename(fileName)
        const filePath = path.join(dir, sanitizedFilename)
        fs.writeFileSync(filePath, bf)

        const totalSize = await this.getStorageSize(paths[0])
        return { path: 'FILE-STORAGE::' + sanitizedFilename, totalSize: totalSize / 1024 / 1024 }
    }

    async getFileFromUpload(filePath: string): Promise<Buffer> {
        return fs.readFileSync(filePath)
    }

    async getFileFromStorage(file: string, ...paths: string[]): Promise<Buffer> {
        const sanitizedFilename = this.sanitizeFilename(file)
        const fileInStorage = this.buildPath(...paths.map((p) => this.sanitizeFilename(p)), sanitizedFilename)
        try {
            return fs.readFileSync(fileInStorage)
        } catch (error) {
            // Fallback: Check if file exists without the first path element (likely orgId)
            if (paths.length > 1) {
                const fallbackPaths = paths.slice(1)
                const fallbackPath = this.buildPath(...fallbackPaths.map((p) => this.sanitizeFilename(p)), sanitizedFilename)

                if (fs.existsSync(fallbackPath)) {
                    // Create directory if it doesn't exist
                    const targetPath = fileInStorage
                    const dir = path.dirname(targetPath)
                    if (!fs.existsSync(dir)) {
                        fs.mkdirSync(dir, { recursive: true })
                    }

                    // Copy file to correct location with orgId
                    fs.copyFileSync(fallbackPath, targetPath)

                    // Delete the old file
                    fs.unlinkSync(fallbackPath)

                    // Clean up empty directories recursively
                    if (fallbackPaths.length > 0) {
                        this.cleanEmptyLocalFolders(this.buildPath(...fallbackPaths.map((p) => this.sanitizeFilename(p)).slice(0, -1)))
                    }

                    return fs.readFileSync(targetPath)
                }
            }
            throw error
        }
    }

    async streamStorageFile(
        chatflowId: string,
        chatId: string,
        fileName: string,
        orgId: string
    ): Promise<fs.ReadStream | Buffer | undefined> {
        // Validate chatflowId and chatId
        this.validateChatflowId(chatflowId)
        this.validatePathSecurity(chatflowId, chatId)

        const sanitizedFilename = this.sanitizeFilename(fileName)
        const filePath = this.buildPath(orgId, chatflowId, chatId, sanitizedFilename)

        //raise error if file path is not absolute
        if (!path.isAbsolute(filePath)) throw new Error(`Invalid file path`)
        //raise error if file path contains '..'
        if (filePath.includes('..')) throw new Error(`Invalid file path`)
        //only return from the storage folder
        if (!filePath.startsWith(this.storagePath)) throw new Error(`Invalid file path`)

        if (fs.existsSync(filePath)) {
            return fs.createReadStream(filePath)
        } else {
            // Fallback: Check if file exists without orgId
            const fallbackPath = this.buildPath(chatflowId, chatId, sanitizedFilename)

            if (fs.existsSync(fallbackPath)) {
                // Create directory if it doesn't exist
                const dir = path.dirname(filePath)
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true })
                }

                // Copy file to correct location with orgId
                fs.copyFileSync(fallbackPath, filePath)

                // Delete the old file
                fs.unlinkSync(fallbackPath)

                // Clean up empty directories recursively
                this.cleanEmptyLocalFolders(path.dirname(fallbackPath))

                return fs.createReadStream(filePath)
            } else {
                throw new Error(`File ${fileName} not found`)
            }
        }
    }

    async getFilesListFromStorage(...paths: string[]): Promise<FileInfo[]> {
        const directory = this.buildPath(...paths)
        return this.getFilePaths(directory)
    }

    private getFilePaths(dir: string): FileInfo[] {
        let results: FileInfo[] = []

        const readDirectory = (directory: string) => {
            try {
                if (!fs.existsSync(directory)) {
                    console.warn(`Directory does not exist: ${directory}`)
                    return
                }

                const list = fs.readdirSync(directory)
                list.forEach((file) => {
                    const filePath = path.join(directory, file)
                    try {
                        const stat = fs.statSync(filePath)
                        if (stat && stat.isDirectory()) {
                            readDirectory(filePath)
                        } else {
                            results.push({ name: file, path: filePath, size: stat.size })
                        }
                    } catch (error) {
                        console.error(`Error processing file ${filePath}:`, error)
                    }
                })
            } catch (error) {
                console.error(`Error reading directory ${directory}:`, error)
            }
        }

        readDirectory(dir)
        return results
    }

    private cleanEmptyLocalFolders(dirPath: string) {
        try {
            // Stop if we reach the storage root
            if (dirPath === this.storagePath) return

            // Check if directory exists
            if (!fs.existsSync(dirPath)) return

            // Read directory contents
            const files = fs.readdirSync(dirPath)

            // If directory is empty, delete it and check parent
            if (files.length === 0) {
                fs.rmdirSync(dirPath)
                // Recursively check parent directory
                this.cleanEmptyLocalFolders(path.dirname(dirPath))
            }
        } catch (error) {
            // Ignore errors during cleanup
            console.error('Error cleaning empty folders:', error)
        }
    }

    async removeFilesFromStorage(...paths: string[]): Promise<StorageSizeResult> {
        const directory = this.buildPath(...paths.map((p) => this.sanitizeFilename(p)))
        await this.deleteLocalFolderRecursive(directory)

        const totalSize = await this.getStorageSize(paths[0])
        return { totalSize: totalSize / 1024 / 1024 }
    }

    async removeSpecificFileFromUpload(filePath: string): Promise<void> {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
        }
    }

    async removeSpecificFileFromStorage(...paths: string[]): Promise<StorageSizeResult> {
        const fileName = paths.pop()
        if (fileName) {
            const sanitizedFilename = this.sanitizeFilename(fileName)
            paths.push(sanitizedFilename)
        }
        const file = this.buildPath(...paths.map((p) => this.sanitizeFilename(p)))

        // check if file exists, if not skip delete
        const stat = fs.statSync(file, { throwIfNoEntry: false })
        if (stat && stat.isFile()) {
            fs.unlinkSync(file)
        }

        const totalSize = await this.getStorageSize(paths[0])
        return { totalSize: totalSize / 1024 / 1024 }
    }

    async removeFolderFromStorage(...paths: string[]): Promise<StorageSizeResult> {
        const directory = this.buildPath(...paths.map((p) => this.sanitizeFilename(p)))
        await this.deleteLocalFolderRecursive(directory, true)

        const totalSize = await this.getStorageSize(paths[0])
        return { totalSize: totalSize / 1024 / 1024 }
    }

    private async deleteLocalFolderRecursive(directory: string, deleteParentChatflowFolder?: boolean): Promise<void> {
        try {
            // Check if the path exists
            await fs.promises.access(directory)

            if (deleteParentChatflowFolder) {
                await fs.promises.rm(directory, { recursive: true })
                return
            }

            // Get stats of the path to determine if it's a file or directory
            const stats = await fs.promises.stat(directory)

            if (stats.isDirectory()) {
                // Read all directory contents
                const files = await fs.promises.readdir(directory)

                // Recursively delete all contents
                for (const file of files) {
                    const currentPath = path.join(directory, file)
                    await this.deleteLocalFolderRecursive(currentPath)
                }

                // Delete the directory itself after emptying it
                await fs.promises.rm(directory, { recursive: true })
            } else {
                // If it's a file, delete it directly
                await fs.promises.unlink(directory)
            }
        } catch (error) {
            // Error handling - ignore if file/directory doesn't exist
        }
    }

    async getStorageSize(orgId: string): Promise<number> {
        if (!orgId) return 0
        const directory = this.buildPath(orgId)
        return this.dirSize(directory)
    }

    private async dirSize(directoryPath: string): Promise<number> {
        let totalSize = 0

        const calculateSize = async (itemPath: string) => {
            try {
                const stats = await fs.promises.stat(itemPath)

                if (stats.isFile()) {
                    totalSize += stats.size
                } else if (stats.isDirectory()) {
                    const files = await fs.promises.readdir(itemPath)
                    for (const file of files) {
                        await calculateSize(path.join(itemPath, file))
                    }
                }
            } catch (error) {
                // Ignore missing files/dirs during calculation
            }
        }

        await calculateSize(directoryPath)
        return totalSize
    }

    getMulterStorage(): multer.Multer {
        const uploadPath = this.getUploadPath()
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true })
        }
        return multer({ dest: uploadPath })
    }

    private getUploadPath(): string {
        return process.env.BLOB_STORAGE_PATH
            ? path.join(process.env.BLOB_STORAGE_PATH, 'uploads')
            : path.join(this.getUserHome(), '.flowise', 'uploads')
    }

    private getUserHome(): string {
        return process.env.HOME || process.env.USERPROFILE || process.env.HOMEPATH || ''
    }

    getLoggerTransports(logType: 'server' | 'error' | 'requests', config?: any): any[] {
        const logDir = config?.logging?.dir || path.join(this.getUserHome(), '.flowise', 'logs')

        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true })
        }

        if (logType === 'server') {
            return [
                new DailyRotateFile({
                    filename: path.join(logDir, config?.logging?.server?.filename ?? 'server-%DATE%.log'),
                    datePattern: 'YYYY-MM-DD-HH',
                    maxSize: '20m',
                    level: config?.logging?.server?.level ?? 'info'
                })
            ]
        } else if (logType === 'requests') {
            return [
                new transports.File({
                    filename: path.join(logDir, config?.logging?.express?.filename ?? 'server-requests.log.jsonl'),
                    level: config?.logging?.express?.level ?? 'debug'
                })
            ]
        }

        // For 'error' type, return empty array (handled by exceptionHandlers in logger.ts)
        return []
    }
}
