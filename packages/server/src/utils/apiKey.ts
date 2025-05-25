import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { ICommonObject } from 'flowise-components'
import fs from 'fs'
import path from 'path'
import { DataSource } from 'typeorm'
import { ApiKey } from '../database/entities/ApiKey'
import { Workspace } from '../enterprise/database/entities/workspace.entity'
import { v4 as uuidv4 } from 'uuid'
import { ChatFlow } from '../database/entities/ChatFlow'
import { addChatflowsCount } from './addChatflowsCount'
import { Platform } from '../Interface'

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
        return []
    }
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

export const migrateApiKeysFromJsonToDb = async (appDataSource: DataSource, platformType: Platform) => {
    if (platformType === Platform.CLOUD) {
        return
    }

    if (!process.env.APIKEY_STORAGE_TYPE || process.env.APIKEY_STORAGE_TYPE === 'json') {
        const keys = await getAPIKeys()
        if (keys.length > 0) {
            try {
                // Get all available workspaces
                const workspaces = await appDataSource.getRepository(Workspace).find()

                for (const key of keys) {
                    const existingKey = await appDataSource.getRepository(ApiKey).findOneBy({
                        apiKey: key.apiKey
                    })

                    // Only add if key doesn't already exist in DB
                    if (!existingKey) {
                        // Create a new API key for each workspace
                        if (workspaces.length > 0) {
                            for (const workspace of workspaces) {
                                const newKey = new ApiKey()
                                newKey.id = uuidv4()
                                newKey.apiKey = key.apiKey
                                newKey.apiSecret = key.apiSecret
                                newKey.keyName = key.keyName
                                newKey.workspaceId = workspace.id

                                const keyEntity = appDataSource.getRepository(ApiKey).create(newKey)
                                await appDataSource.getRepository(ApiKey).save(keyEntity)

                                const chatflows = await appDataSource.getRepository(ChatFlow).findBy({
                                    apikeyid: key.id,
                                    workspaceId: workspace.id
                                })

                                for (const chatflow of chatflows) {
                                    chatflow.apikeyid = newKey.id
                                    await appDataSource.getRepository(ChatFlow).save(chatflow)
                                }

                                await addChatflowsCount(chatflows)
                            }
                        } else {
                            // If no workspaces exist, create the key without a workspace ID and later will be updated by setNullWorkspaceId
                            const newKey = new ApiKey()
                            newKey.id = uuidv4()
                            newKey.apiKey = key.apiKey
                            newKey.apiSecret = key.apiSecret
                            newKey.keyName = key.keyName

                            const keyEntity = appDataSource.getRepository(ApiKey).create(newKey)
                            await appDataSource.getRepository(ApiKey).save(keyEntity)

                            const chatflows = await appDataSource.getRepository(ChatFlow).findBy({
                                apikeyid: key.id
                            })

                            for (const chatflow of chatflows) {
                                chatflow.apikeyid = newKey.id
                                await appDataSource.getRepository(ChatFlow).save(chatflow)
                            }

                            await addChatflowsCount(chatflows)
                        }
                    }
                }

                // Delete the JSON file
                if (fs.existsSync(getAPIKeyPath())) {
                    fs.unlinkSync(getAPIKeyPath())
                }
            } catch (error) {
                console.error('Error migrating API keys from JSON to DB', error)
            }
        }
    }
}
