// Path: packages/components/src/utils.ts

import path from 'path'
import { getStoragePath } from './utils'
import fs from 'fs'

export const addFilesToStorage = (file: string, chatflowid: string, fileNames: string[]) => {
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

export const addFileToStorage = (bf: Buffer, fileName: string, ...paths: string[]) => {
    const dir = path.join(getStoragePath(), ...paths)
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
    }

    const filePath = path.join(dir, fileName)
    fs.writeFileSync(filePath, bf)
}

export const getFileFromStorage = (file: string, ...paths: string[]): Buffer => {
    const fileInStorage = path.join(getStoragePath(), ...paths, file)
    return fs.readFileSync(fileInStorage)
}
