import { S3Client, S3ClientConfig } from '@aws-sdk/client-s3'
import { Disk } from 'flydrive'
// @ts-ignore
import { FSDriver } from 'flydrive/drivers/fs'
// @ts-ignore
import { S3Driver } from 'flydrive/drivers/s3'
import { Readable } from 'node:stream'
import path from 'path'
import sanitize from 'sanitize-filename'
import { getUserHome } from './utils'
let disk: Disk

export const initStorage = () => {
    const storageType = getStorageType()
    if (storageType === 's3') {
        const { s3Client, Bucket } = getS3Config()
        disk = new Disk(new S3Driver({ client: s3Client, bucket: Bucket, visibility: 'private' }))
    } else {
        disk = new Disk(
            new FSDriver({
                location: getStoragePath(),
                visibility: 'private'
            })
        )
    }
}

export const addBase64FilesToStorage = async (fileBase64: string, chatflowid: string, fileNames: string[]) => {
    if (!disk) initStorage()

    const splitDataURI = fileBase64.split(',')
    const filename = splitDataURI.pop()?.split(':')[1] ?? ''
    const bf = Buffer.from(splitDataURI.pop() || '', 'base64')
    const mime = splitDataURI[0].split(':')[1].split(';')[0]
    const sanitizedFilename = _sanitizeFilename(filename)

    const filePath = path.join(chatflowid, sanitizedFilename)
    await disk.put(filePath, bf, { contentType: mime, contentEncoding: 'base64' })

    fileNames.push(sanitizedFilename)
    return 'FILE-STORAGE::' + JSON.stringify(fileNames)
}

export const addArrayFilesToStorage = async (mime: string, bf: Buffer, fileName: string, fileNames: string[], ...paths: string[]) => {
    if (!disk) initStorage()

    const sanitizedFilename = _sanitizeFilename(fileName)
    const filePath = path.join(...paths, sanitizedFilename)
    await disk.put(filePath, bf, { contentType: mime, contentEncoding: 'base64' })

    fileNames.push(sanitizedFilename)
    return 'FILE-STORAGE::' + JSON.stringify(fileNames)
}

export const addSingleFileToStorage = async (mime: string, bf: Buffer, fileName: string, ...paths: string[]) => {
    if (!disk) initStorage()

    const sanitizedFilename = _sanitizeFilename(fileName)
    const filePath = path.join(...paths, sanitizedFilename)
    await disk.put(filePath, bf, { contentType: mime, contentEncoding: 'base64' })

    return 'FILE-STORAGE::' + sanitizedFilename
}

export const getFileFromStorage = async (file: string, ...paths: string[]): Promise<Buffer> => {
    if (!disk) initStorage()

    const filePath = path.join(...paths, file)
    const exists = await disk.exists(filePath)
    if (!exists) throw new Error(`File ${file} not found`)

    const content = await disk.get(filePath)
    return Buffer.from(content)
}

export const removeFilesFromStorage = async (...paths: string[]) => {
    if (!disk) initStorage()

    const filePath = path.join(...paths)
    await disk.delete(filePath)
}

export const removeSpecificFileFromStorage = async (...paths: string[]) => {
    if (!disk) initStorage()

    const fileName = paths.pop()
    if (fileName) {
        const sanitizedFilename = _sanitizeFilename(fileName)
        paths.push(sanitizedFilename)
    }
    const filePath = path.join(...paths)
    await disk.delete(filePath)
}

export const removeFolderFromStorage = async (...paths: string[]) => {
    if (!disk) initStorage()

    const folderPath = path.join(...paths)
    await disk.deleteAll(folderPath)
}
// fs.ReadStream
export const streamStorageFile = async (chatflowId: string, chatId: string, fileName: string): Promise<Readable> => {
    if (!disk) initStorage()

    const sanitizedFilename = _sanitizeFilename(fileName)
    const filePath = path.join(chatflowId, chatId, sanitizedFilename)

    const exists = await disk.exists(filePath)
    if (!exists) throw new Error(`File ${fileName} not found`)

    return disk.getStream(filePath)
}

export const getStoragePath = (): string => {
    return process.env.BLOB_STORAGE_PATH ? path.join(process.env.BLOB_STORAGE_PATH) : path.join(getUserHome(), '.flowise', 'storage')
}

export const getStorageType = (): string => {
    return process.env.STORAGE_TYPE ? process.env.STORAGE_TYPE : 'local'
}

export const getS3Config = () => {
    const accessKeyId = process.env.S3_STORAGE_ACCESS_KEY_ID
    const secretAccessKey = process.env.S3_STORAGE_SECRET_ACCESS_KEY
    const region = process.env.S3_STORAGE_REGION
    const Bucket = process.env.S3_STORAGE_BUCKET_NAME
    const customURL = process.env.S3_ENDPOINT_URL
    const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true'

    if (!region || !Bucket) {
        throw new Error('S3 storage configuration is missing')
    }

    let credentials: S3ClientConfig['credentials'] | undefined
    if (accessKeyId && secretAccessKey) {
        credentials = {
            accessKeyId,
            secretAccessKey
        }
    }

    const s3Client = new S3Client({
        credentials,
        region,
        endpoint: customURL,
        forcePathStyle: forcePathStyle
    })
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
