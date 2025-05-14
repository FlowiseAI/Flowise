import path from 'path'
import fs from 'fs'
import {
    DeleteObjectsCommand,
    GetObjectCommand,
    ListObjectsV2Command,
    PutObjectCommand,
    ListObjectsCommand,
    S3Client,
    S3ClientConfig
} from '@aws-sdk/client-s3'
import { Storage } from '@google-cloud/storage'
import { Readable } from 'node:stream'
import { getUserHome } from './utils'
import sanitize from 'sanitize-filename'

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
        const normalizedPaths = paths.map((p) => p.replace(/\\/g, '/'))
        const normalizedFilename = sanitizedFilename.replace(/\\/g, '/')
        const filePath = [...normalizedPaths, normalizedFilename].join('/')
        const file = bucket.file(filePath)
        const [buffer] = await file.download()
        return buffer
    } else {
        const fileInStorage = path.join(getStoragePath(), ...paths.map(_sanitizeFilename), sanitizedFilename)
        return fs.readFileSync(fileInStorage)
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
    return process.env.BLOB_STORAGE_PATH ? path.join(process.env.BLOB_STORAGE_PATH) : path.join(getUserHome(), '.flowise', 'storage')
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
    const storageType = getStorageType()
    const sanitizedFilename = sanitize(fileName)
    if (storageType === 's3') {
        const { s3Client, Bucket } = getS3Config()

        const Key = orgId + '/' + chatflowId + '/' + chatId + '/' + sanitizedFilename
        const getParams = {
            Bucket,
            Key
        }
        const response = await s3Client.send(new GetObjectCommand(getParams))
        const body = response.Body
        if (body instanceof Readable) {
            const blob = await body.transformToByteArray()
            return Buffer.from(blob)
        }
    } else if (storageType === 'gcs') {
        const { bucket } = getGcsClient()
        const normalizedChatflowId = chatflowId.replace(/\\/g, '/')
        const normalizedChatId = chatId.replace(/\\/g, '/')
        const normalizedFilename = sanitizedFilename.replace(/\\/g, '/')
        const filePath = `${normalizedChatflowId}/${normalizedChatId}/${normalizedFilename}`
        const [buffer] = await bucket.file(filePath).download()
        return buffer
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
            throw new Error(`File ${fileName} not found`)
        }
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

    if (!pathToGcsCredential) {
        throw new Error('GOOGLE_CLOUD_STORAGE_CREDENTIAL env variable is required')
    }
    if (!bucketName) {
        throw new Error('GOOGLE_CLOUD_STORAGE_BUCKET_NAME env variable is required')
    }

    const storageConfig = {
        keyFilename: pathToGcsCredential,
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

    if (!region || !Bucket) {
        throw new Error('S3 storage configuration is missing')
    }

    const s3Config: S3ClientConfig = {
        region: region,
        endpoint: customURL,
        forcePathStyle: forcePathStyle
    }

    if (accessKeyId && secretAccessKey) {
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
