// Path: packages/components/src/utils.ts

import path from 'path'
import fs from 'fs'
import { getUserHome } from './utils'
import { DeleteObjectsCommand, GetObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { Readable } from 'node:stream'

export const addFilesToStorage = async (file: string, chatflowid: string, fileNames: string[]) => {
    const storageType = getStorageType()
    if (storageType === 's3') {
        const { s3Client, Bucket } = getS3Config()
        //construct a string from the paths array, and add the filename at the end. This will be the key for the object in S3
        const splitDataURI = file.split(',')
        const filename = splitDataURI.pop()?.split(':')[1] ?? ''
        const bf = Buffer.from(splitDataURI.pop() || '', 'base64')
        const mime = splitDataURI[0].split(':')[1].split(';')[0]

        const key = chatflowid + '/' + filename
        const putObjCmd = new PutObjectCommand({
            Bucket,
            Key: key,
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
        //construct a string from the paths array, and add the filename at the end. This will be the key for the object in S3
        let key = paths.reduce((acc, cur) => acc + '/' + cur, '') + '/' + fileName
        // remove the first '/' if it exists
        if (key.startsWith('/')) {
            key = key.substring(1)
        }

        const putObjCmd = new PutObjectCommand({
            Bucket,
            Key: key,
            ContentEncoding: 'base64', // required for binary data
            ContentType: mime,
            Body: bf
        })
        const putResponse = await s3Client.send(putObjCmd)
    } else {
        const dir = path.join(getStoragePath(), ...paths)
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
        }

        const filePath = path.join(dir, fileName)
        fs.writeFileSync(filePath, bf)
    }
}

export const getFileFromStorage = async (file: string, ...paths: string[]): Promise<Buffer> => {
    const storageType = getStorageType()
    if (storageType === 's3') {
        const { s3Client, Bucket } = getS3Config()
        //construct a string from the paths array, and add the filename at the end. This will be the key for the object in S3
        let Key = paths.reduce((acc, cur) => acc + '/' + cur, '') + '/' + file
        // remove the first '/' if it exists
        if (Key.startsWith('/')) {
            Key = Key.substring(1)
        }

        const getParams = {
            Bucket: Bucket,
            Key: Key // path to the object we're looking for
        }

        const response = await s3Client.send(new GetObjectCommand(getParams))
        const body = response.Body
        if (body instanceof Readable) {
            //const blob = await body.transformToByteArray()
            const streamToString = await response.Body?.transformToString('base64')
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

const _deleteLocalFolderRecursive = (directory: string) => {
    if (fs.existsSync(directory)) {
        fs.readdir(directory, (error, files) => {
            if (error) throw new Error('Could not read directory')

            files.forEach((file) => {
                const file_path = path.join(directory, file)

                fs.stat(file_path, (error, stat) => {
                    if (error) throw new Error('File do not exist')

                    if (!stat.isDirectory()) {
                        fs.unlink(file_path, (error) => {
                            if (error) throw new Error('Could not delete file')
                        })
                    } else {
                        _deleteLocalFolderRecursive(file_path)
                    }
                })
            })
        })
    }
}

async function _deleteS3Folder(location: string) {
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
            // if items to delete
            // delete the files
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
            // log any errors deleting files
            if (deleted.Errors) {
                deleted.Errors.map((error: any) => console.error(`${error.Key} could not be deleted - ${error.Code}`))
            }
        }
        // repeat if more files to delete
        if (list.NextContinuationToken) {
            await recursiveS3Delete(list.NextContinuationToken)
        }
        // return total deleted count when finished
        return `${count} files deleted.`
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
        //construct a string from the paths array, and add the filename at the end. This will be the key for the object in S3
        const Key = chatflowId + '/' + chatId + '/' + fileName
        const getParams = {
            Bucket: Bucket,
            Key: Key // path to the object we're looking for
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
    // upload to S3
    const s3Client = new S3Client({
        credentials: {
            accessKeyId,
            secretAccessKey
        },
        region
    })
    return { s3Client, Bucket }
}
