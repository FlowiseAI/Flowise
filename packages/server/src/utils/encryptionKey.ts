import { randomBytes } from 'crypto'
import { getEncryptionKeyPath } from 'flowise-components'
import fs from 'fs'

import { StatusCodes } from 'http-status-codes'
import { Encryption } from '../database/entities/Encryption'
import { InternalFlowiseError } from '../errors/internalFlowiseError'
import { getErrorMessage } from '../errors/utils'
import { getRunningExpressApp } from './getRunningExpressApp'

/**
 * Generate an encryption key
 * @returns {string}
 */
export const generateEncryptKey = async (): Promise<string> => {
    try {
        console.log('=========> packages\\server\\src\\utils\\encryptionKey.ts generateEncryptKey')
        const appServer = getRunningExpressApp()

        // step 1 - get value of FLOWISE_SECRETKEY_OVERWRITE
        let SECRETKEY_OVERWRITE: string = ''
        if (process.env.FLOWISE_SECRETKEY_OVERWRITE !== undefined && process.env.FLOWISE_SECRETKEY_OVERWRITE !== '')
            SECRETKEY_OVERWRITE = process.env.FLOWISE_SECRETKEY_OVERWRITE

        // step 2 - get value of SECRETKEY_FROM_PATH if exists
        let SECRETKEY_FROM_PATH: string = ''
        try {
            SECRETKEY_FROM_PATH = await fs.promises.readFile(getEncryptionKeyPath(), 'utf8')
        } catch (error) {
            // bypass error if not found, there's no need to create this file anymore
        }

        // step 3 - get all encryptionKey values from database
        let dbFindResponse = await appServer.AppDataSource.getRepository(Encryption).find({ select: { encryptionKey: true } })
        const encryptionKeys = dbFindResponse.map((response) => {
            return response.encryptionKey
        })

        // step 4 - insert SECRETKEY into database if not duplicate
        const prepEncryptionKeys: Partial<Encryption>[] = []
        let nameCounter: number = encryptionKeys.length
        const pushToPrepEncryptionKeys = (SECRETKEY: string) => {
            if (SECRETKEY != '' && !encryptionKeys.includes(SECRETKEY)) {
                nameCounter += 1
                prepEncryptionKeys.push({ name: nameCounter.toString(), encryptionKey: SECRETKEY })
            }
        }
        pushToPrepEncryptionKeys(SECRETKEY_FROM_PATH)
        pushToPrepEncryptionKeys(SECRETKEY_OVERWRITE)
        if (prepEncryptionKeys.length != 0) await appServer.AppDataSource.getRepository(Encryption).insert(prepEncryptionKeys)

        // step 5 - return value based on latest updated date
        try {
            const encryptionKey: string = await getEncryptionKey()
            return encryptionKey
        } catch (error) {
            // bypass error if no encryptionKey found in database
        }

        // step 6 - will reach when there are no encryptionKey value created in SECRETKEY_OVERWRITE, SECRETKEY_FROM_PATH and encryption table in database
        const newEncryptionKey: string = randomBytes(24).toString('base64')
        nameCounter += 1
        await appServer.AppDataSource.getRepository(Encryption).insert({
            name: nameCounter.toString(),
            encryptionKey: newEncryptionKey
        })
        console.log(`Reach return newEncryptionKey: ${newEncryptionKey}`)
        return newEncryptionKey
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: utils.generateEncryptKey - ${getErrorMessage(error)}`)
    }
}

/**
 * Returns the encryption key
 * @returns {Promise<string>}
 */
export const getEncryptionKey = async (): Promise<string> => {
    try {
        console.log('=========> packages\\server\\src\\utils\\encryptionKey.ts getEncryptionKey')
        const appServer = getRunningExpressApp()

        // step 1 - get latest encryption based on updatedDate descending
        const dbFindResponse = await appServer.AppDataSource.getRepository(Encryption).find({
            select: { id: true, encryptionKey: true },
            order: { updatedDate: 'DESC' }
        })
        if (dbFindResponse.length != 0) {
            console.log(`Reach return encryptionKey: ${dbFindResponse[0].encryptionKey}`)
            return dbFindResponse[0].encryptionKey
        }
        throw new Error('No encryption key available')
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: utils.getEncryptionKey - ${getErrorMessage(error)}`)
    }
}
