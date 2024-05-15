import path from 'path'
import fs from 'fs'
import { DeleteObjectsCommand, GetObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { Readable } from 'node:stream'
import { getUserHome } from './utils'

export const addBase64FilesToStorage = async (file: string, chatflowid: string, fileNames: string[]) => {
    const storageType = getStorageType()
    if (storageType === 's3') {
        const { s3Client, Bucket } = getS3Config()

        const splitDataURI = file.split(',')
        const filename = splitDataURI.pop()?.split(':')[1] ?? ''
        const bf = Buffer.from(splitDataURI.pop() || '', 'base64')
        const mime = splitDataURI[0].split(':')[1].split(';')[0]

        const Key = chatflowid + '/' + filename
        const putObjCmd = new PutObjectCommand({
            Bucket,
            Key,
            ContentEncoding: 'base64', // required for binary data
            ContentType: mime,
            Body: bf
        })
        await s3Client.send(putObjCmd)

        fileNames.push(filename)
        return 'FILE-STORAGE::' + JSON.stringify(fileNames)
    } else {
        const dir = path.join(getStoragePath(), chatflowid)
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
        }

        const splitDataURI = file.split(',')
        const filename = splitDataURI.pop()?.split(':')[1] ?? ''
        const bf = Buffer.from(splitDataURI.pop() || '', 'base64')

        const filePath = path.join(dir, filename)
        fs.writeFileSync(filePath, bf)
        fileNames.push(filename)
        return 'FILE-STORAGE::' + JSON.stringify(fileNames)
    }
}

export const addFileToStorage = async (mime: string, bf: Buffer, fileName: string, ...paths: string[]) => {
    const storageType = getStorageType()
    if (storageType === 's3') {
        const { s3Client, Bucket } = getS3Config()

        let Key = paths.reduce((acc, cur) => acc + '/' + cur, '') + '/' + fileName
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
        return 'FILE-STORAGE::' + fileName
    } else {
        const dir = path.join(getStoragePath(), ...paths)
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
        }

        const filePath = path.join(dir, fileName)
        fs.writeFileSync(filePath, bf)
        return 'FILE-STORAGE::' + fileName
    }
}

export const getFileFromStorage = async (file: string, ...paths: string[]): Promise<Buffer> => {
    const storageType = getStorageType()
    if (storageType === 's3') {
        const { s3Client, Bucket } = getS3Config()

        let Key = paths.reduce((acc, cur) => acc + '/' + cur, '') + '/' + file
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
    } else {
        const fileInStorage = path.join(getStoragePath(), ...paths, file)
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
    } else {
        const directory = path.join(getStoragePath(), ...paths)
        _deleteLocalFolderRecursive(directory)
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
    } else {
        const file = path.join(getStoragePath(), ...paths)
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
    } else {
        const directory = path.join(getStoragePath(), ...paths)
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
    if (storageType === 's3') {
        const { s3Client, Bucket } = getS3Config()

        const Key = chatflowId + '/' + chatId + '/' + fileName
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
    } else {
        const filePath = path.join(getStoragePath(), chatflowId, chatId, fileName)
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

const getS3Config = () => {
    const accessKeyId = process.env.S3_STORAGE_ACCESS_KEY_ID
    const secretAccessKey = process.env.S3_STORAGE_SECRET_ACCESS_KEY
    const region = process.env.S3_STORAGE_REGION
    const Bucket = process.env.S3_STORAGE_BUCKET_NAME
    if (!accessKeyId || !secretAccessKey || !region || !Bucket) {
        throw new Error('S3 storage configuration is missing')
    }
    const s3Client = new S3Client({
        credentials: {
            accessKeyId,
            secretAccessKey
        },
        region
    })
    return { s3Client, Bucket }
}
