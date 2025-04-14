import path from 'path'
import fs from 'fs'
import {
    DeleteObjectsCommand,
    GetObjectCommand,
    ListObjectsV2Command,
    PutObjectCommand,
    S3Client,
    S3ClientConfig
} from '@aws-sdk/client-s3'
import { Storage } from '@google-cloud/storage'
import { Readable } from 'node:stream'
import { getUserHome } from './utils'
import sanitize from 'sanitize-filename'

export const addBase64FilesToStorage = async (fileBase64: string, chatflowid: string, fileNames: string[]) => {
    const storageType = getStorageType()
    if (storageType === 's3') {
        const { s3Client, Bucket } = getS3Config()

        const splitDataURI = fileBase64.split(',')
        const filename = splitDataURI.pop()?.split(':')[1] ?? ''
        const bf = Buffer.from(splitDataURI.pop() || '', 'base64')
        const mime = splitDataURI[0].split(':')[1].split(';')[0]

        const sanitizedFilename = _sanitizeFilename(filename)

        const Key = chatflowid + '/' + sanitizedFilename
        const putObjCmd = new PutObjectCommand({
            Bucket,
            Key,
            ContentEncoding: 'base64', // required for binary data
            ContentType: mime,
            Body: bf
        })
        await s3Client.send(putObjCmd)

        fileNames.push(sanitizedFilename)
        return 'FILE-STORAGE::' + JSON.stringify(fileNames)
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
        return 'FILE-STORAGE::' + JSON.stringify(fileNames)
    } else {
        const dir = path.join(getStoragePath(), chatflowid)
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
        return 'FILE-STORAGE::' + JSON.stringify(fileNames)
    }
}

export const addArrayFilesToStorage = async (mime: string, bf: Buffer, fileName: string, fileNames: string[], ...paths: string[]) => {
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
        return 'FILE-STORAGE::' + JSON.stringify(fileNames)
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
        return 'FILE-STORAGE::' + JSON.stringify(fileNames)
    } else {
        const dir = path.join(getStoragePath(), ...paths.map(_sanitizeFilename))
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
        }
        const filePath = path.join(dir, sanitizedFilename)
        fs.writeFileSync(filePath, bf)
        fileNames.push(sanitizedFilename)
        return 'FILE-STORAGE::' + JSON.stringify(fileNames)
    }
}

export const addSingleFileToStorage = async (mime: string, bf: Buffer, fileName: string, ...paths: string[]) => {
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
        return 'FILE-STORAGE::' + sanitizedFilename
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
        return 'FILE-STORAGE::' + sanitizedFilename
    } else {
        const dir = path.join(getStoragePath(), ...paths.map(_sanitizeFilename))
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
        }
        const filePath = path.join(dir, sanitizedFilename)
        fs.writeFileSync(filePath, bf)
        return 'FILE-STORAGE::' + sanitizedFilename
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
    } else if (storageType === 'gcs') {
        const { bucket } = getGcsClient()
        const normalizedPath = paths.map((p) => p.replace(/\\/g, '/')).join('/')
        await bucket.deleteFiles({ prefix: `${normalizedPath}/` })
    } else {
        const directory = path.join(getStoragePath(), ...paths.map(_sanitizeFilename))
        _deleteLocalFolderRecursive(directory)
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
    } else if (storageType === 'gcs') {
        const { bucket } = getGcsClient()
        const fileName = paths.pop()
        if (fileName) {
            const sanitizedFilename = _sanitizeFilename(fileName)
            paths.push(sanitizedFilename)
        }
        const normalizedPath = paths.map((p) => p.replace(/\\/g, '/')).join('/')
        await bucket.file(normalizedPath).delete()
    } else {
        const fileName = paths.pop()
        if (fileName) {
            const sanitizedFilename = _sanitizeFilename(fileName)
            paths.push(sanitizedFilename)
        }
        const file = path.join(getStoragePath(), ...paths.map(_sanitizeFilename))
        fs.unlinkSync(file)
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
    } else if (storageType === 'gcs') {
        const { bucket } = getGcsClient()
        const normalizedPath = paths.map((p) => p.replace(/\\/g, '/')).join('/')
        await bucket.deleteFiles({ prefix: `${normalizedPath}/` })
    } else {
        const directory = path.join(getStoragePath(), ...paths.map(_sanitizeFilename))
        _deleteLocalFolderRecursive(directory, true)
    }
}

const _deleteLocalFolderRecursive = (directory: string, deleteParentChatflowFolder?: boolean) => {
    // Console error here as failing is not destructive operation
    if (fs.existsSync(directory)) {
        if (deleteParentChatflowFolder) {
            fs.rmSync(directory, { recursive: true, force: true })
        } else {
            fs.readdir(directory, (error, files) => {
                if (error) console.error('Could not read directory')

                for (let i = 0; i < files.length; i++) {
                    const file = files[i]
                    const file_path = path.join(directory, file)

                    fs.stat(file_path, (error, stat) => {
                        if (error) console.error('File do not exist')

                        if (!stat.isDirectory()) {
                            fs.unlink(file_path, (error) => {
                                if (error) console.error('Could not delete file')
                            })
                            if (i === files.length - 1) {
                                fs.rmSync(directory, { recursive: true, force: true })
                            }
                        } else {
                            _deleteLocalFolderRecursive(file_path)
                        }
                    })
                }
            })
        }
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
    fileName: string
): Promise<fs.ReadStream | Buffer | undefined> => {
    const storageType = getStorageType()
    const sanitizedFilename = sanitize(fileName)
    if (storageType === 's3') {
        const { s3Client, Bucket } = getS3Config()

        const Key = chatflowId + '/' + chatId + '/' + sanitizedFilename
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
        const filePath = path.join(getStoragePath(), chatflowId, chatId, sanitizedFilename)
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
