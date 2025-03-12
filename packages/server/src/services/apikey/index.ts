import { StatusCodes } from 'http-status-codes'
import {
    addAPIKey as addAPIKey_json,
    deleteAPIKey as deleteAPIKey_json,
    generateAPIKey,
    generateSecretHash,
    getApiKey as getApiKey_json,
    getAPIKeys as getAPIKeys_json,
    updateAPIKey as updateAPIKey_json,
    replaceAllAPIKeys as replaceAllAPIKeys_json,
    importKeys as importKeys_json
} from '../../utils/apiKey'
import { addChatflowsCount } from '../../utils/addChatflowsCount'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { ApiKey } from '../../database/entities/ApiKey'
import { appConfig } from '../../AppConfig'
import { randomBytes } from 'crypto'
import { Not, IsNull } from 'typeorm'
import { IUser } from '../../Interface'

const _apikeysStoredInJson = (): boolean => {
    return appConfig.apiKeys.storageType === 'json'
}

const _apikeysStoredInDb = (): boolean => {
    return appConfig.apiKeys.storageType === 'db'
}

const getAllApiKeys = async (user: IUser) => {
    if (!user) {
        throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, `Unauthorized`)
    }
    try {
        if (_apikeysStoredInJson()) {
            const keys = await getAPIKeys_json()
            return await addChatflowsCount(keys)
        } else if (_apikeysStoredInDb()) {
            const appServer = getRunningExpressApp()
            let keys = await appServer.AppDataSource.getRepository(ApiKey).find({
                where: {
                    organizationId: user.organizationId,
                    userId: user.id
                }
            })
            if (keys.length === 0) {
                await createApiKey('DefaultKey', user)
                keys = await appServer.AppDataSource.getRepository(ApiKey).find({
                    where: {
                        organizationId: user.organizationId,
                        userId: user.id
                    }
                })
            }
            return await addChatflowsCount(keys)
        } else {
            throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `UNKNOWN APIKEY_STORAGE_TYPE`)
        }
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: apikeyService.getAllApiKeys - ${getErrorMessage(error)}`)
    }
}

const getApiKey = async (apiKey: string) => {
    try {
        if (_apikeysStoredInJson()) {
            return getApiKey_json(apiKey)
        } else if (_apikeysStoredInDb()) {
            const appServer = getRunningExpressApp()
            const currentKey = await appServer.AppDataSource.getRepository(ApiKey).findOneBy({
                apiKey: apiKey
            })
            if (!currentKey) {
                return undefined
            }
            return currentKey
        } else {
            throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `UNKNOWN APIKEY_STORAGE_TYPE`)
        }
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: apikeyService.createApiKey - ${getErrorMessage(error)}`)
    }
}

const createApiKey = async (keyName: string, user: IUser) => {
    try {
        if (_apikeysStoredInJson()) {
            const keys = await addAPIKey_json(keyName)
            return await addChatflowsCount(keys)
        } else if (_apikeysStoredInDb()) {
            const apiKey = generateAPIKey()
            const apiSecret = generateSecretHash(apiKey)
            const appServer = getRunningExpressApp()
            const newKey = new ApiKey()
            newKey.id = randomBytes(16).toString('hex')
            newKey.apiKey = apiKey
            newKey.apiSecret = apiSecret
            newKey.keyName = keyName
            newKey.organizationId = user.organizationId
            newKey.userId = user.id
            const key = appServer.AppDataSource.getRepository(ApiKey).create(newKey)
            await appServer.AppDataSource.getRepository(ApiKey).save(key)
            return getAllApiKeys(user)
        } else {
            throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `UNKNOWN APIKEY_STORAGE_TYPE`)
        }
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: apikeyService.createApiKey - ${getErrorMessage(error)}`)
    }
}

// Update api key
const updateApiKey = async (id: string, keyName: string, user: IUser) => {
    try {
        if (_apikeysStoredInJson()) {
            const keys = await updateAPIKey_json(id, keyName)
            return await addChatflowsCount(keys)
        } else if (_apikeysStoredInDb()) {
            const appServer = getRunningExpressApp()
            const currentKey = await appServer.AppDataSource.getRepository(ApiKey).findOneBy({
                id: id
            })
            if (!currentKey) {
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `ApiKey ${currentKey} not found`)
            }
            currentKey.keyName = keyName
            await appServer.AppDataSource.getRepository(ApiKey).save(currentKey)
            return getAllApiKeys(user)
        } else {
            throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `UNKNOWN APIKEY_STORAGE_TYPE`)
        }
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: apikeyService.updateApiKey - ${getErrorMessage(error)}`)
    }
}

const deleteApiKey = async (id: string, user: IUser) => {
    try {
        if (_apikeysStoredInJson()) {
            const keys = await deleteAPIKey_json(id)
            return await addChatflowsCount(keys)
        } else if (_apikeysStoredInDb()) {
            const appServer = getRunningExpressApp()
            const dbResponse = await appServer.AppDataSource.getRepository(ApiKey).delete({
                id: id,
                organizationId: user.organizationId,
                userId: user.id
            })
            if (!dbResponse) {
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `ApiKey ${id} not found`)
            }
            return getAllApiKeys(user)
        } else {
            throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `UNKNOWN APIKEY_STORAGE_TYPE`)
        }
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: apikeyService.deleteApiKey - ${getErrorMessage(error)}`)
    }
}

const importKeys = async (body: any, user: IUser) => {
    try {
        const jsonFile = body.jsonFile
        const splitDataURI = jsonFile.split(',')
        if (splitDataURI[0] !== 'data:application/json;base64') {
            throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Invalid dataURI`)
        }
        const bf = Buffer.from(splitDataURI[1] || '', 'base64')
        const plain = bf.toString('utf8')
        const keys = JSON.parse(plain)
        if (_apikeysStoredInJson()) {
            if (body.importMode === 'replaceAll') {
                await replaceAllAPIKeys_json(keys)
            } else {
                await importKeys_json(keys, body.importMode)
            }
            return await addChatflowsCount(keys)
        } else if (_apikeysStoredInDb()) {
            const appServer = getRunningExpressApp()
            const allApiKeys = await appServer.AppDataSource.getRepository(ApiKey).find()
            if (body.importMode === 'replaceAll') {
                await appServer.AppDataSource.getRepository(ApiKey).delete({
                    id: Not(IsNull())
                })
            }
            if (body.importMode === 'errorIfExist') {
                // if importMode is errorIfExist, check for existing keys and raise error before any modification to the DB
                for (const key of keys) {
                    const keyNameExists = allApiKeys.find((k) => k.keyName === key.keyName)
                    if (keyNameExists) {
                        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Key with name ${key.keyName} already exists`)
                    }
                }
            }
            // iterate through the keys and add them to the database
            for (const key of keys) {
                const keyNameExists = allApiKeys.find((k) => k.keyName === key.keyName)
                if (keyNameExists) {
                    const keyIndex = allApiKeys.findIndex((k) => k.keyName === key.keyName)
                    switch (body.importMode) {
                        case 'overwriteIfExist': {
                            const currentKey = allApiKeys[keyIndex]
                            currentKey.id = key.id
                            currentKey.apiKey = key.apiKey
                            currentKey.apiSecret = key.apiSecret
                            await appServer.AppDataSource.getRepository(ApiKey).save(currentKey)
                            break
                        }
                        case 'ignoreIfExist': {
                            // ignore this key and continue
                            continue
                        }
                        case 'errorIfExist': {
                            // should not reach here as we have already checked for existing keys
                            throw new Error(`Key with name ${key.keyName} already exists`)
                        }
                        default: {
                            throw new Error(`Unknown overwrite option ${body.importMode}`)
                        }
                    }
                } else {
                    const newKey = new ApiKey()
                    newKey.id = key.id
                    newKey.apiKey = key.apiKey
                    newKey.apiSecret = key.apiSecret
                    newKey.keyName = key.keyName
                    const newKeyEntity = appServer.AppDataSource.getRepository(ApiKey).create(newKey)
                    await appServer.AppDataSource.getRepository(ApiKey).save(newKeyEntity)
                }
            }
            return getAllApiKeys(user)
        } else {
            throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `UNKNOWN APIKEY_STORAGE_TYPE`)
        }
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: apikeyService.importKeys - ${getErrorMessage(error)}`)
    }
}

const verifyApiKey = async (paramApiKey: string): Promise<ApiKey | null> => {
    try {
        if (_apikeysStoredInJson()) {
            const apiKeyData = await getApiKey_json(paramApiKey)
            if (!apiKeyData) {
                // console.log(`[ApiKey] Failed verification attempt with key: ${paramApiKey.substring(0, 8)}...`)
                throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, `Unauthorized`)
            }
            // Convert JSON data to ApiKey entity
            const apiKey = new ApiKey()
            Object.assign(apiKey, apiKeyData)
            console.log(`[ApiKey] Successfully verified key: ${apiKey.keyName} (${apiKey.id})`)
            return apiKey
        } else if (_apikeysStoredInDb()) {
            const appServer = getRunningExpressApp()
            const apiKey = await appServer.AppDataSource.getRepository(ApiKey).findOneBy({
                apiKey: paramApiKey,
                isActive: true
            })
            if (!apiKey) {
                // console.log(`[ApiKey] Failed verification attempt with key: ${paramApiKey.substring(0, 8)}...`)
                throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, `Unauthorized`)
            }
            // Update lastUsedAt
            apiKey.lastUsedAt = new Date()
            await appServer.AppDataSource.getRepository(ApiKey).save(apiKey)
            console.log(`[ApiKey] Successfully verified key: ${apiKey.userId}  ${apiKey.keyName} (${apiKey.id})`)
            return apiKey
        } else {
            console.error('[ApiKey] Unknown storage type configuration')
            throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `UNKNOWN APIKEY_STORAGE_TYPE`)
        }
    } catch (error) {
        if (error instanceof InternalFlowiseError && error.statusCode === StatusCodes.UNAUTHORIZED) {
            throw error
        } else {
            console.error(`[ApiKey] Verification error:`, error)
            throw new InternalFlowiseError(
                StatusCodes.INTERNAL_SERVER_ERROR,
                `Error: apikeyService.verifyApiKey - ${getErrorMessage(error)}`
            )
        }
    }
}

export default {
    createApiKey,
    deleteApiKey,
    getAllApiKeys,
    updateApiKey,
    verifyApiKey,
    getApiKey,
    importKeys
}
