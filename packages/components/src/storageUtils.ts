import {
    DeleteObjectsCommand,
    GetObjectCommand,
    ListObjectsCommand,
    ListObjectsV2Command,
    PutObjectCommand,
    S3Client,
    S3ClientConfig
} from '@aws-sdk/client-s3'
import { Storage } from '@google-cloud/storage'
import fs from 'fs'
import { Readable } from 'node:stream'
import path from 'path'
import sanitize from 'sanitize-filename'
import { getUserHome } from './utils'
import { isPathTraversal, isValidUUID } from './validator'

const dirSize = async (directoryPath: string) => {
    let totalSize = 0

    async function calculateSize(itemPath: string) {
        const stats = await fs.promises.stat(itemPath)

        if (stats.isFile()) {
            totalSize += stats.size
        } else if (stats.isDirectory()) {
            const files = await fs.promises.readdir(itemPath)
            for (const file of files) {
                await calculateSize(path.join(itemPath, file))
            }
        }
    }

    await calculateSize(directoryPath)
    return totalSize
}

export const addBase64FilesToStorage = async (
    fileBase64: string,
    chatflowid: string,
    fileNames: string[],
    orgId: string
): Promise<{ path: string; totalSize: number }> => {
    // Validate chatflowid
    if (!chatflowid || !isValidUUID(chatflowid)) {
        throw new Error('Invalid chatflowId format - must be a valid UUID')
    }

    // Check for path traversal attempts
    if (isPathTraversal(chatflowid)) {
        throw new Error('Invalid path characters detected in chatflowId')
    }

    const storageType = getStorageType()
    if (storageType === 's3') {
        const { s3Client, Bucket } = getS3Config()

        const splitDataURI = fileBase64.split(',')
        const filename = splitDataURI.pop()?.split(':')[1] ?? ''
        const bf = Buffer.from(splitDataURI.pop() || '', 'base64')
        const mime = splitDataURI[0].split(':')[1].split(';')[0]

        const sanitizedFilename = _sanitizeFilename(filename)
        const Key = orgId + '/' + chatflowid + '/' + sanitizedFilename

        const putObjCmd = new PutObjectCommand({
            Bucket,
            Key,
            ContentEncoding: 'base64', // required for binary data
            ContentType: mime,
            Body: bf
        })
        await s3Client.send(putObjCmd)

        fileNames.push(sanitizedFilename)
        const totalSize = await getS3StorageSize(orgId)

        return { path: 'FILE-STORAGE::' + JSON.stringify(fileNames), totalSize: totalSize / 1024 / 1024 }
    } else if (storageType === 'gcs') {
        const { bucket } = getGcsClient()
        const splitDataURI = fileBase64.split(',')
        const filename = splitDataURI.pop()?.split(':')[1] ?? ''
        const bf = Buffer.from(splitDataURI.pop() || '', 'base64')
        const mime = splitDataURI[0].split(':')[1].split(';')[0]
        const sanitizedFilename = _sanitizeFilename(filename)
        const normalizedChatflowid = chatflowid.replace(/\\/g, '/')
        const normalizedFilename = sanitizedFilename.replace(/\\/g, '/')
        const filePath = `${normalizedChatflowid}/${normalizedFilename}`
        const file = bucket.file(filePath)
        await new Promise<void>((resolve, reject) => {
            file.createWriteStream({ contentType: mime, metadata: { contentEncoding: 'base64' } })
                .on('error', (err) => reject(err))
                .on('finish', () => resolve())
                .end(bf)
        })
        fileNames.push(sanitizedFilename)
        const totalSize = await getGCSStorageSize(orgId)

        return { path: 'FILE-STORAGE::' + JSON.stringify(fileNames), totalSize: totalSize / 1024 / 1024 }
    } else {
        const dir = path.join(getStoragePath(), orgId, chatflowid)
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
        }

        const splitDataURI = fileBase64.split(',')
        const filename = splitDataURI.pop()?.split(':')[1] ?? ''
        const bf = Buffer.from(splitDataURI.pop() || '', 'base64')
        const sanitizedFilename = _sanitizeFilename(filename)

        const filePath = path.join(dir, sanitizedFilename)

        fs.writeFileSync(filePath, bf)
        fileNames.push(sanitizedFilename)

        const totalSize = await dirSize(path.join(getStoragePath(), orgId))
        return { path: 'FILE-STORAGE::' + JSON.stringify(fileNames), totalSize: totalSize / 1024 / 1024 }
    }
}

export const addArrayFilesToStorage = async (
    mime: string,
    bf: Buffer,
    fileName: string,
    fileNames: string[],
    ...paths: string[]
): Promise<{ path: string; totalSize: number }> => {
    const storageType = getStorageType()

    const sanitizedFilename = _sanitizeFilename(fileName)
    if (storageType === 's3') {
        const { s3Client, Bucket } = getS3Config()

        let Key = paths.reduce((acc, cur) => acc + '/' + cur, '') + '/' + sanitizedFilename
        if (Key.startsWith('/')) {
            Key = Key.substring(1)
        }

        const putObjCmd = new PutObjectCommand({
            Bucket,
            Key,
            ContentEncoding: 'base64', // required for binary data
            ContentType: mime,
            Body: bf
        })
        await s3Client.send(putObjCmd)
        fileNames.push(sanitizedFilename)

        const totalSize = await getS3StorageSize(paths[0])

        return { path: 'FILE-STORAGE::' + JSON.stringify(fileNames), totalSize: totalSize / 1024 / 1024 }
    } else if (storageType === 'gcs') {
        const { bucket } = getGcsClient()
        const normalizedPaths = paths.map((p) => p.replace(/\\/g, '/'))
        const normalizedFilename = sanitizedFilename.replace(/\\/g, '/')
        const filePath = [...normalizedPaths, normalizedFilename].join('/')
        const file = bucket.file(filePath)
        await new Promise<void>((resolve, reject) => {
            file.createWriteStream()
                .on('error', (err) => reject(err))
                .on('finish', () => resolve())
                .end(bf)
        })
        fileNames.push(sanitizedFilename)

        const totalSize = await getGCSStorageSize(paths[0])

        return { path: 'FILE-STORAGE::' + JSON.stringify(fileNames), totalSize: totalSize / 1024 / 1024 }
    } else {
        const dir = path.join(getStoragePath(), ...paths.map(_sanitizeFilename))
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
        }
        const filePath = path.join(dir, sanitizedFilename)
        fs.writeFileSync(filePath, bf)
        fileNames.push(sanitizedFilename)

        const totalSize = await dirSize(path.join(getStoragePath(), paths[0]))

        return { path: 'FILE-STORAGE::' + JSON.stringify(fileNames), totalSize: totalSize / 1024 / 1024 }
    }
}

export const addSingleFileToStorage = async (
    mime: string,
    bf: Buffer,
    fileName: string,
    ...paths: string[]
): Promise<{ path: string; totalSize: number }> => {
    const storageType = getStorageType()
    const sanitizedFilename = _sanitizeFilename(fileName)

    if (storageType === 's3') {
        const { s3Client, Bucket } = getS3Config()

        let Key = paths.reduce((acc, cur) => acc + '/' + cur, '') + '/' + sanitizedFilename
        if (Key.startsWith('/')) {
            Key = Key.substring(1)
        }

        const putObjCmd = new PutObjectCommand({
            Bucket,
            Key,
            ContentEncoding: 'base64', // required for binary data
            ContentType: mime,
            Body: bf
        })
        await s3Client.send(putObjCmd)

        const totalSize = await getS3StorageSize(paths[0])

        return { path: 'FILE-STORAGE::' + sanitizedFilename, totalSize: totalSize / 1024 / 1024 }
    } else if (storageType === 'gcs') {
        const { bucket } = getGcsClient()
        const normalizedPaths = paths.map((p) => p.replace(/\\/g, '/'))
        const normalizedFilename = sanitizedFilename.replace(/\\/g, '/')
        const filePath = [...normalizedPaths, normalizedFilename].join('/')
        const file = bucket.file(filePath)
        await new Promise<void>((resolve, reject) => {
            file.createWriteStream({ contentType: mime, metadata: { contentEncoding: 'base64' } })
                .on('error', (err) => reject(err))
                .on('finish', () => resolve())
                .end(bf)
        })

        const totalSize = await getGCSStorageSize(paths[0])

        return { path: 'FILE-STORAGE::' + sanitizedFilename, totalSize: totalSize / 1024 / 1024 }
    } else {
        const dir = path.join(getStoragePath(), ...paths.map(_sanitizeFilename))
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
        }
        const filePath = path.join(dir, sanitizedFilename)
        fs.writeFileSync(filePath, bf)

        const totalSize = await dirSize(path.join(getStoragePath(), paths[0]))
        return { path: 'FILE-STORAGE::' + sanitizedFilename, totalSize: totalSize / 1024 / 1024 }
    }
}

export const getFileFromUpload = async (filePath: string): Promise<Buffer> => {
    const storageType = getStorageType()
    if (storageType === 's3') {
        const { s3Client, Bucket } = getS3Config()

        let Key = filePath
        // remove the first '/' if it exists
        if (Key.startsWith('/')) {
            Key = Key.substring(1)
        }
        const getParams = {
            Bucket,
            Key
        }

        const response = await s3Client.send(new GetObjectCommand(getParams))
        const body = response.Body
        if (body instanceof Readable) {
            const streamToString = await body.transformToString('base64')
            if (streamToString) {
                return Buffer.from(streamToString, 'base64')
            }
        }
        // @ts-ignore
        const buffer = Buffer.concat(response.Body.toArray())
        return buffer
    } else if (storageType === 'gcs') {
        const { bucket } = getGcsClient()
        const file = bucket.file(filePath)
        const [buffer] = await file.download()
        return buffer
    } else {
        return fs.readFileSync(filePath)
    }
}

export const getFileFromStorage = async (file: string, ...paths: string[]): Promise<Buffer> => {
    const storageType = getStorageType()
    const sanitizedFilename = _sanitizeFilename(file)

    if (storageType === 's3') {
        const { s3Client, Bucket } = getS3Config()

        let Key = paths.reduce((acc, cur) => acc + '/' + cur, '') + '/' + sanitizedFilename
        if (Key.startsWith('/')) {
            Key = Key.substring(1)
        }

        try {
            const getParams = {
                Bucket,
                Key
            }

            const response = await s3Client.send(new GetObjectCommand(getParams))
            const body = response.Body
            if (body instanceof Readable) {
                const streamToString = await body.transformToString('base64')
                if (streamToString) {
                    return Buffer.from(streamToString, 'base64')
                }
            }
            // @ts-ignore
            const buffer = Buffer.concat(response.Body.toArray())
            return buffer
        } catch (error) {
            // Fallback: Check if file exists without the first path element (likely orgId)
            if (paths.length > 1) {
                const fallbackPaths = paths.slice(1)
                let fallbackKey = fallbackPaths.reduce((acc, cur) => acc + '/' + cur, '') + '/' + sanitizedFilename
                if (fallbackKey.startsWith('/')) {
                    fallbackKey = fallbackKey.substring(1)
                }

                try {
                    const fallbackParams = {
                        Bucket,
                        Key: fallbackKey
                    }
                    const fallbackResponse = await s3Client.send(new GetObjectCommand(fallbackParams))
                    const fallbackBody = fallbackResponse.Body

                    // Get the file content
                    let fileContent: Buffer
                    if (fallbackBody instanceof Readable) {
                        const streamToString = await fallbackBody.transformToString('base64')
                        if (streamToString) {
                            fileContent = Buffer.from(streamToString, 'base64')
                        } else {
                            // @ts-ignore
                            fileContent = Buffer.concat(fallbackBody.toArray())
                        }
                    } else {
                        // @ts-ignore
                        fileContent = Buffer.concat(fallbackBody.toArray())
                    }

                    // Move to correct location with orgId
                    const putObjCmd = new PutObjectCommand({
                        Bucket,
                        Key,
                        Body: fileContent
                    })
                    await s3Client.send(putObjCmd)

                    // Delete the old file
                    await s3Client.send(
                        new DeleteObjectsCommand({
                            Bucket,
                            Delete: {
                                Objects: [{ Key: fallbackKey }],
                                Quiet: false
                            }
                        })
                    )

                    // Check if the directory is empty and delete recursively if needed
                    if (fallbackPaths.length > 0) {
                        await _cleanEmptyS3Folders(s3Client, Bucket, fallbackPaths[0])
                    }

                    return fileContent
                } catch (fallbackError) {
                    // Throw the original error since the fallback also failed
                    throw error
                }
            } else {
                throw error
            }
        }
    } else if (storageType === 'gcs') {
        const { bucket } = getGcsClient()
        const normalizedPaths = paths.map((p) => p.replace(/\\/g, '/'))
        const normalizedFilename = sanitizedFilename.replace(/\\/g, '/')
        const filePath = [...normalizedPaths, normalizedFilename].join('/')

        try {
            const file = bucket.file(filePath)
            const [buffer] = await file.download()
            return buffer
        } catch (error) {
            // Fallback: Check if file exists without the first path element (likely orgId)
            if (normalizedPaths.length > 1) {
                const fallbackPaths = normalizedPaths.slice(1)
                const fallbackPath = [...fallbackPaths, normalizedFilename].join('/')

                try {
                    const fallbackFile = bucket.file(fallbackPath)
                    const [buffer] = await fallbackFile.download()

                    // Move to correct location with orgId
                    const file = bucket.file(filePath)
                    await new Promise<void>((resolve, reject) => {
                        file.createWriteStream()
                            .on('error', (err) => reject(err))
                            .on('finish', () => resolve())
                            .end(buffer)
                    })

                    // Delete the old file
                    await fallbackFile.delete()

                    // Check if the directory is empty and delete recursively if needed
                    if (fallbackPaths.length > 0) {
                        await _cleanEmptyGCSFolders(bucket, fallbackPaths[0])
                    }

                    return buffer
                } catch (fallbackError) {
                    // Throw the original error since the fallback also failed
                    throw error
                }
            } else {
                throw error
            }
        }
    } else {
        try {
            const fileInStorage = path.join(getStoragePath(), ...paths.map(_sanitizeFilename), sanitizedFilename)
            return fs.readFileSync(fileInStorage)
        } catch (error) {
            // Fallback: Check if file exists without the first path element (likely orgId)
            if (paths.length > 1) {
                const fallbackPaths = paths.slice(1)
                const fallbackPath = path.join(getStoragePath(), ...fallbackPaths.map(_sanitizeFilename), sanitizedFilename)

                if (fs.existsSync(fallbackPath)) {
                    // Create directory if it doesn't exist
                    const targetPath = path.join(getStoragePath(), ...paths.map(_sanitizeFilename), sanitizedFilename)
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
                        _cleanEmptyLocalFolders(path.join(getStoragePath(), ...fallbackPaths.map(_sanitizeFilename).slice(0, -1)))
                    }

                    return fs.readFileSync(targetPath)
                } else {
                    throw error
                }
            } else {
                throw error
            }
        }
    }
}

export const getFilesListFromStorage = async (...paths: string[]): Promise<Array<{ name: string; path: string; size: number }>> => {
    const storageType = getStorageType()
    if (storageType === 's3') {
        const { s3Client, Bucket } = getS3Config()

        let Key = paths.reduce((acc, cur) => acc + '/' + cur, '')
        if (Key.startsWith('/')) {
            Key = Key.substring(1)
        }

        const listCommand = new ListObjectsV2Command({
            Bucket,
            Prefix: Key
        })
        const list = await s3Client.send(listCommand)

        if (list.Contents && list.Contents.length > 0) {
            return list.Contents.map((item) => ({
                name: item.Key?.split('/').pop() || '',
                path: item.Key ?? '',
                size: item.Size || 0
            }))
        } else {
            return []
        }
    } else {
        const directory = path.join(getStoragePath(), ...paths)
        const filesList = getFilePaths(directory)
        return filesList
    }
}

interface FileInfo {
    name: string
    path: string
    size: number
}

function getFilePaths(dir: string): FileInfo[] {
    let results: FileInfo[] = []

    function readDirectory(directory: string) {
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
                        const sizeInMB = stat.size / (1024 * 1024)
                        results.push({ name: file, path: filePath, size: sizeInMB })
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
 * Get the storage type - local or s3
 */
export const getStorageType = (): string => {
    return process.env.STORAGE_TYPE ? process.env.STORAGE_TYPE : 'local'
}

export const removeFilesFromStorage = async (...paths: string[]) => {
    const storageType = getStorageType()
    if (storageType === 's3') {
        let Key = paths.reduce((acc, cur) => acc + '/' + cur, '')
        // remove the first '/' if it exists
        if (Key.startsWith('/')) {
            Key = Key.substring(1)
        }

        await _deleteS3Folder(Key)

        // check folder size after deleting all the files
        const totalSize = await getS3StorageSize(paths[0])
        return { totalSize: totalSize / 1024 / 1024 }
    } else if (storageType === 'gcs') {
        const { bucket } = getGcsClient()
        const normalizedPath = paths.map((p) => p.replace(/\\/g, '/')).join('/')
        await bucket.deleteFiles({ prefix: `${normalizedPath}/` })

        const totalSize = await getGCSStorageSize(paths[0])
        return { totalSize: totalSize / 1024 / 1024 }
    } else {
        const directory = path.join(getStoragePath(), ...paths.map(_sanitizeFilename))
        await _deleteLocalFolderRecursive(directory)

        const totalSize = await dirSize(path.join(getStoragePath(), paths[0]))

        return { totalSize: totalSize / 1024 / 1024 }
    }
}

export const removeSpecificFileFromUpload = async (filePath: string) => {
    const storageType = getStorageType()
    if (storageType === 's3') {
        let Key = filePath
        // remove the first '/' if it exists
        if (Key.startsWith('/')) {
            Key = Key.substring(1)
        }
        await _deleteS3Folder(Key)
    } else if (storageType === 'gcs') {
        const { bucket } = getGcsClient()
        await bucket.file(filePath).delete()
    } else {
        fs.unlinkSync(filePath)
    }
}

export const removeSpecificFileFromStorage = async (...paths: string[]) => {
    const storageType = getStorageType()
    if (storageType === 's3') {
        let Key = paths.reduce((acc, cur) => acc + '/' + cur, '')
        // remove the first '/' if it exists
        if (Key.startsWith('/')) {
            Key = Key.substring(1)
        }
        await _deleteS3Folder(Key)

        // check folder size after deleting all the files
        const totalSize = await getS3StorageSize(paths[0])
        return { totalSize: totalSize / 1024 / 1024 }
    } else if (storageType === 'gcs') {
        const { bucket } = getGcsClient()
        const fileName = paths.pop()
        if (fileName) {
            const sanitizedFilename = _sanitizeFilename(fileName)
            paths.push(sanitizedFilename)
        }
        const normalizedPath = paths.map((p) => p.replace(/\\/g, '/')).join('/')
        await bucket.file(normalizedPath).delete()

        const totalSize = await getGCSStorageSize(paths[0])
        return { totalSize: totalSize / 1024 / 1024 }
    } else {
        const fileName = paths.pop()
        if (fileName) {
            const sanitizedFilename = _sanitizeFilename(fileName)
            paths.push(sanitizedFilename)
        }
        const file = path.join(getStoragePath(), ...paths.map(_sanitizeFilename))
        // check if file exists, if not skip delete
        // this might happen when user tries to delete a document loader but the attached file is already deleted
        const stat = fs.statSync(file, { throwIfNoEntry: false })
        if (stat && stat.isFile()) {
            fs.unlinkSync(file)
        }

        const totalSize = await dirSize(path.join(getStoragePath(), paths[0]))
        return { totalSize: totalSize / 1024 / 1024 }
    }
}

export const removeFolderFromStorage = async (...paths: string[]) => {
    const storageType = getStorageType()
    if (storageType === 's3') {
        let Key = paths.reduce((acc, cur) => acc + '/' + cur, '')
        // remove the first '/' if it exists
        if (Key.startsWith('/')) {
            Key = Key.substring(1)
        }
        await _deleteS3Folder(Key)

        // check folder size after deleting all the files
        const totalSize = await getS3StorageSize(paths[0])
        return { totalSize: totalSize / 1024 / 1024 }
    } else if (storageType === 'gcs') {
        const { bucket } = getGcsClient()
        const normalizedPath = paths.map((p) => p.replace(/\\/g, '/')).join('/')
        await bucket.deleteFiles({ prefix: `${normalizedPath}/` })

        const totalSize = await getGCSStorageSize(paths[0])
        return { totalSize: totalSize / 1024 / 1024 }
    } else {
        const directory = path.join(getStoragePath(), ...paths.map(_sanitizeFilename))
        await _deleteLocalFolderRecursive(directory, true)

        const totalSize = await dirSize(path.join(getStoragePath(), paths[0]))
        return { totalSize: totalSize / 1024 / 1024 }
    }
}

const _deleteLocalFolderRecursive = async (directory: string, deleteParentChatflowFolder?: boolean) => {
    try {
        // Check if the path exists
        await fs.promises.access(directory)

        if (deleteParentChatflowFolder) {
            await fs.promises.rmdir(directory, { recursive: true })
        }

        // Get stats of the path to determine if it's a file or directory
        const stats = await fs.promises.stat(directory)

        if (stats.isDirectory()) {
            // Read all directory contents
            const files = await fs.promises.readdir(directory)

            // Recursively delete all contents
            for (const file of files) {
                const currentPath = path.join(directory, file)
                await _deleteLocalFolderRecursive(currentPath) // Recursive call
            }

            // Delete the directory itself after emptying it
            await fs.promises.rmdir(directory, { recursive: true })
        } else {
            // If it's a file, delete it directly
            await fs.promises.unlink(directory)
        }
    } catch (error) {
        // Error handling
    }
}

const _deleteS3Folder = async (location: string) => {
    let count = 0 // number of files deleted
    const { s3Client, Bucket } = getS3Config()

    async function recursiveS3Delete(token?: any) {
        // get the files
        const listCommand = new ListObjectsV2Command({
            Bucket: Bucket,
            Prefix: location,
            ContinuationToken: token
        })
        let list = await s3Client.send(listCommand)
        if (list.KeyCount) {
            const deleteCommand = new DeleteObjectsCommand({
                Bucket: Bucket,
                Delete: {
                    Objects: list.Contents?.map((item) => ({ Key: item.Key })),
                    Quiet: false
                }
            })
            let deleted = await s3Client.send(deleteCommand)
            // @ts-ignore
            count += deleted.Deleted.length

            if (deleted.Errors) {
                deleted.Errors.map((error: any) => console.error(`${error.Key} could not be deleted - ${error.Code}`))
            }
        }
        // repeat if more files to delete
        if (list.NextContinuationToken) {
            await recursiveS3Delete(list.NextContinuationToken)
        }
        // return total deleted count when finished
        return `${count} files deleted from S3`
    }

    // start the recursive function
    return recursiveS3Delete()
}

export const streamStorageFile = async (
    chatflowId: string,
    chatId: string,
    fileName: string,
    orgId: string
): Promise<fs.ReadStream | Buffer | undefined> => {
    // Validate chatflowId
    if (!chatflowId || !isValidUUID(chatflowId)) {
        throw new Error('Invalid chatflowId format - must be a valid UUID')
    }

    // Check for path traversal attempts
    if (isPathTraversal(chatflowId) || isPathTraversal(chatId)) {
        throw new Error('Invalid path characters detected in chatflowId or chatId')
    }

    const storageType = getStorageType()
    const sanitizedFilename = sanitize(fileName)
    if (storageType === 's3') {
        const { s3Client, Bucket } = getS3Config()

        const Key = orgId + '/' + chatflowId + '/' + chatId + '/' + sanitizedFilename
        const getParams = {
            Bucket,
            Key
        }
        try {
            const response = await s3Client.send(new GetObjectCommand(getParams))
            const body = response.Body
            if (body instanceof Readable) {
                const blob = await body.transformToByteArray()
                return Buffer.from(blob)
            }
        } catch (error) {
            // Fallback: Check if file exists without orgId
            const fallbackKey = chatflowId + '/' + chatId + '/' + sanitizedFilename
            try {
                const fallbackParams = {
                    Bucket,
                    Key: fallbackKey
                }
                const fallbackResponse = await s3Client.send(new GetObjectCommand(fallbackParams))
                const fallbackBody = fallbackResponse.Body

                // If found, copy to correct location with orgId
                if (fallbackBody) {
                    // Get the file content
                    let fileContent: Buffer
                    if (fallbackBody instanceof Readable) {
                        const blob = await fallbackBody.transformToByteArray()
                        fileContent = Buffer.from(blob)
                    } else {
                        // @ts-ignore
                        fileContent = Buffer.concat(fallbackBody.toArray())
                    }

                    // Move to correct location with orgId
                    const putObjCmd = new PutObjectCommand({
                        Bucket,
                        Key,
                        Body: fileContent
                    })
                    await s3Client.send(putObjCmd)

                    // Delete the old file
                    await s3Client.send(
                        new DeleteObjectsCommand({
                            Bucket,
                            Delete: {
                                Objects: [{ Key: fallbackKey }],
                                Quiet: false
                            }
                        })
                    )

                    // Check if the directory is empty and delete recursively if needed
                    await _cleanEmptyS3Folders(s3Client, Bucket, chatflowId)

                    return fileContent
                }
            } catch (fallbackError) {
                // File not found in fallback location either
                throw new Error(`File ${fileName} not found`)
            }
        }
    } else if (storageType === 'gcs') {
        const { bucket } = getGcsClient()
        const normalizedChatflowId = chatflowId.replace(/\\/g, '/')
        const normalizedChatId = chatId.replace(/\\/g, '/')
        const normalizedFilename = sanitizedFilename.replace(/\\/g, '/')
        const filePath = `${orgId}/${normalizedChatflowId}/${normalizedChatId}/${normalizedFilename}`

        try {
            const [buffer] = await bucket.file(filePath).download()
            return buffer
        } catch (error) {
            // Fallback: Check if file exists without orgId
            const fallbackPath = `${normalizedChatflowId}/${normalizedChatId}/${normalizedFilename}`
            try {
                const fallbackFile = bucket.file(fallbackPath)
                const [buffer] = await fallbackFile.download()

                // If found, copy to correct location with orgId
                if (buffer) {
                    const file = bucket.file(filePath)
                    await new Promise<void>((resolve, reject) => {
                        file.createWriteStream()
                            .on('error', (err) => reject(err))
                            .on('finish', () => resolve())
                            .end(buffer)
                    })

                    // Delete the old file
                    await fallbackFile.delete()

                    // Check if the directory is empty and delete recursively if needed
                    await _cleanEmptyGCSFolders(bucket, normalizedChatflowId)

                    return buffer
                }
            } catch (fallbackError) {
                // File not found in fallback location either
                throw new Error(`File ${fileName} not found`)
            }
        }
    } else {
        const filePath = path.join(getStoragePath(), orgId, chatflowId, chatId, sanitizedFilename)
        //raise error if file path is not absolute
        if (!path.isAbsolute(filePath)) throw new Error(`Invalid file path`)
        //raise error if file path contains '..'
        if (filePath.includes('..')) throw new Error(`Invalid file path`)
        //only return from the storage folder
        if (!filePath.startsWith(getStoragePath())) throw new Error(`Invalid file path`)

        if (fs.existsSync(filePath)) {
            return fs.createReadStream(filePath)
        } else {
            // Fallback: Check if file exists without orgId
            const fallbackPath = path.join(getStoragePath(), chatflowId, chatId, sanitizedFilename)

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
                _cleanEmptyLocalFolders(path.join(getStoragePath(), chatflowId, chatId))

                return fs.createReadStream(filePath)
            } else {
                throw new Error(`File ${fileName} not found`)
            }
        }
    }
}

/**
 * Check if a local directory is empty and delete it if so,
 * then check parent directories recursively
 */
const _cleanEmptyLocalFolders = (dirPath: string) => {
    try {
        // Stop if we reach the storage root
        if (dirPath === getStoragePath()) return

        // Check if directory exists
        if (!fs.existsSync(dirPath)) return

        // Read directory contents
        const files = fs.readdirSync(dirPath)

        // If directory is empty, delete it and check parent
        if (files.length === 0) {
            fs.rmdirSync(dirPath)
            // Recursively check parent directory
            _cleanEmptyLocalFolders(path.dirname(dirPath))
        }
    } catch (error) {
        // Ignore errors during cleanup
        console.error('Error cleaning empty folders:', error)
    }
}

/**
 * Check if an S3 "folder" is empty and delete it recursively
 */
const _cleanEmptyS3Folders = async (s3Client: S3Client, Bucket: string, prefix: string) => {
    try {
        // Skip if prefix is empty
        if (!prefix) return

        // List objects in this "folder"
        const listCmd = new ListObjectsV2Command({
            Bucket,
            Prefix: prefix + '/',
            Delimiter: '/'
        })

        const response = await s3Client.send(listCmd)

        // If folder is empty (only contains common prefixes but no files)
        if (
            (response.Contents?.length === 0 || !response.Contents) &&
            (response.CommonPrefixes?.length === 0 || !response.CommonPrefixes)
        ) {
            // Delete the folder marker if it exists
            await s3Client.send(
                new DeleteObjectsCommand({
                    Bucket,
                    Delete: {
                        Objects: [{ Key: prefix + '/' }],
                        Quiet: true
                    }
                })
            )

            // Recursively check parent folder
            const parentPrefix = prefix.substring(0, prefix.lastIndexOf('/'))
            if (parentPrefix) {
                await _cleanEmptyS3Folders(s3Client, Bucket, parentPrefix)
            }
        }
    } catch (error) {
        // Ignore errors during cleanup
        console.error('Error cleaning empty S3 folders:', error)
    }
}

/**
 * Check if a GCS "folder" is empty and delete recursively if so
 */
const _cleanEmptyGCSFolders = async (bucket: any, prefix: string) => {
    try {
        // Skip if prefix is empty
        if (!prefix) return

        // List files with this prefix
        const [files] = await bucket.getFiles({
            prefix: prefix + '/',
            delimiter: '/'
        })

        // If folder is empty (no files)
        if (files.length === 0) {
            // Delete the folder marker if it exists
            try {
                await bucket.file(prefix + '/').delete()
            } catch (err) {
                // Folder marker might not exist, ignore
            }

            // Recursively check parent folder
            const parentPrefix = prefix.substring(0, prefix.lastIndexOf('/'))
            if (parentPrefix) {
                await _cleanEmptyGCSFolders(bucket, parentPrefix)
            }
        }
    } catch (error) {
        // Ignore errors during cleanup
        console.error('Error cleaning empty GCS folders:', error)
    }
}

export const getGCSStorageSize = async (orgId: string): Promise<number> => {
    const { bucket } = getGcsClient()
    let totalSize = 0

    const [files] = await bucket.getFiles({ prefix: orgId })

    for (const file of files) {
        const size = file.metadata.size
        // Handle different types that size could be
        if (typeof size === 'string') {
            totalSize += parseInt(size, 10) || 0
        } else if (typeof size === 'number') {
            totalSize += size
        }
    }

    return totalSize
}

export const getGcsClient = () => {
    const pathToGcsCredential = process.env.GOOGLE_CLOUD_STORAGE_CREDENTIAL
    const projectId = process.env.GOOGLE_CLOUD_STORAGE_PROJ_ID
    const bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET_NAME

    if (!bucketName) {
        throw new Error('GOOGLE_CLOUD_STORAGE_BUCKET_NAME env variable is required')
    }

    const storageConfig = {
        ...(pathToGcsCredential ? { keyFilename: pathToGcsCredential } : {}),
        ...(projectId ? { projectId } : {})
    }

    const storage = new Storage(storageConfig)
    const bucket = storage.bucket(bucketName)
    return { storage, bucket }
}

export const getS3StorageSize = async (orgId: string): Promise<number> => {
    const { s3Client, Bucket } = getS3Config()
    const getCmd = new ListObjectsCommand({
        Bucket,
        Prefix: orgId
    })
    const headObj = await s3Client.send(getCmd)
    let totalSize = 0
    for (const obj of headObj.Contents || []) {
        totalSize += obj.Size || 0
    }
    return totalSize
}

export const getS3Config = () => {
    const accessKeyId = process.env.S3_STORAGE_ACCESS_KEY_ID
    const secretAccessKey = process.env.S3_STORAGE_SECRET_ACCESS_KEY
    const region = process.env.S3_STORAGE_REGION
    const Bucket = process.env.S3_STORAGE_BUCKET_NAME
    const customURL = process.env.S3_ENDPOINT_URL
    const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true' ? true : false

    if (!region || region.trim() === '' || !Bucket || Bucket.trim() === '') {
        throw new Error('S3 storage configuration is missing')
    }

    const s3Config: S3ClientConfig = {
        region: region,
        forcePathStyle: forcePathStyle
    }

    // Only include endpoint if customURL is not empty
    if (customURL && customURL.trim() !== '') {
        s3Config.endpoint = customURL
    }

    if (accessKeyId && accessKeyId.trim() !== '' && secretAccessKey && secretAccessKey.trim() !== '') {
        s3Config.credentials = {
            accessKeyId: accessKeyId,
            secretAccessKey: secretAccessKey
        }
    }

    const s3Client = new S3Client(s3Config)

    return { s3Client, Bucket }
}

const _sanitizeFilename = (filename: string): string => {
    if (filename) {
        let sanitizedFilename = sanitize(filename)
        // remove all leading .
        return sanitizedFilename.replace(/^\.+/, '')
    }
    return ''
}
