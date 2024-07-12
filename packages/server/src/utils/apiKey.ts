import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { ICommonObject } from 'flowise-components'
import moment from 'moment'
import fs from 'fs'
import path from 'path'
import logger from './logger'

/**
 * Returns the api key path
 * @returns {string}
 */
export const getAPIKeyPath = (): string => {
    return process.env.APIKEY_PATH ? path.join(process.env.APIKEY_PATH, 'api.json') : path.join(__dirname, '..', '..', 'api.json')
}

/**
 * Generate the api key
 * @returns {string}
 */
export const generateAPIKey = (): string => {
    const buffer = randomBytes(32)
    return buffer.toString('base64url')
}

/**
 * Generate the secret key
 * @param {string} apiKey
 * @returns {string}
 */
export const generateSecretHash = (apiKey: string): string => {
    const salt = randomBytes(8).toString('hex')
    const buffer = scryptSync(apiKey, salt, 64) as Buffer
    return `${buffer.toString('hex')}.${salt}`
}

/**
 * Verify valid keys
 * @param {string} storedKey
 * @param {string} suppliedKey
 * @returns {boolean}
 */
export const compareKeys = (storedKey: string, suppliedKey: string): boolean => {
    const [hashedPassword, salt] = storedKey.split('.')
    const buffer = scryptSync(suppliedKey, salt, 64) as Buffer
    return timingSafeEqual(Buffer.from(hashedPassword, 'hex'), buffer)
}

/**
 * Get API keys
 * @returns {Promise<ICommonObject[]>}
 */
export const getAPIKeys = async (): Promise<ICommonObject[]> => {
    try {
        const content = await fs.promises.readFile(getAPIKeyPath(), 'utf8')
        return JSON.parse(content)
    } catch (error) {
        const keyName = 'DefaultKey'
        const apiKey = generateAPIKey()
        const apiSecret = generateSecretHash(apiKey)
        const content = [
            {
                keyName,
                apiKey,
                apiSecret,
                createdAt: moment().format('DD-MMM-YY'),
                id: randomBytes(16).toString('hex')
            }
        ]
        await fs.promises.writeFile(getAPIKeyPath(), JSON.stringify(content), 'utf8')
        return content
    }
}

/**
 * Add new API key
 * @param {string} keyName
 * @returns {Promise<ICommonObject[]>}
 */
export const addAPIKey = async (keyName: string): Promise<ICommonObject[]> => {
    const existingAPIKeys = await getAPIKeys()
    const apiKey = generateAPIKey()
    const apiSecret = generateSecretHash(apiKey)
    const content = [
        ...existingAPIKeys,
        {
            keyName,
            apiKey,
            apiSecret,
            createdAt: moment().format('DD-MMM-YY'),
            id: randomBytes(16).toString('hex')
        }
    ]
    await fs.promises.writeFile(getAPIKeyPath(), JSON.stringify(content), 'utf8')
    return content
}

/**
 * Get API Key details
 * @param {string} apiKey
 * @returns {Promise<ICommonObject[]>}
 */
export const getApiKey = async (apiKey: string) => {
    const existingAPIKeys = await getAPIKeys()
    const keyIndex = existingAPIKeys.findIndex((key) => key.apiKey === apiKey)
    if (keyIndex < 0) return undefined
    return existingAPIKeys[keyIndex]
}

/**
 * Update existing API key
 * @param {string} keyIdToUpdate
 * @param {string} newKeyName
 * @returns {Promise<ICommonObject[]>}
 */
export const updateAPIKey = async (keyIdToUpdate: string, newKeyName: string): Promise<ICommonObject[]> => {
    const existingAPIKeys = await getAPIKeys()
    const keyIndex = existingAPIKeys.findIndex((key) => key.id === keyIdToUpdate)
    if (keyIndex < 0) return []
    existingAPIKeys[keyIndex].keyName = newKeyName
    await fs.promises.writeFile(getAPIKeyPath(), JSON.stringify(existingAPIKeys), 'utf8')
    return existingAPIKeys
}

/**
 * Delete API key
 * @param {string} keyIdToDelete
 * @returns {Promise<ICommonObject[]>}
 */
export const deleteAPIKey = async (keyIdToDelete: string): Promise<ICommonObject[]> => {
    const existingAPIKeys = await getAPIKeys()
    const result = existingAPIKeys.filter((key) => key.id !== keyIdToDelete)
    await fs.promises.writeFile(getAPIKeyPath(), JSON.stringify(result), 'utf8')
    return result
}

/**
 * Replace all api keys
 * @param {ICommonObject[]} content
 * @returns {Promise<void>}
 */
export const replaceAllAPIKeys = async (content: ICommonObject[]): Promise<void> => {
    try {
        await fs.promises.writeFile(getAPIKeyPath(), JSON.stringify(content), 'utf8')
    } catch (error) {
        logger.error(error)
    }
}
