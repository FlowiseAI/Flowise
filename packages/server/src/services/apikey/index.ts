import { StatusCodes } from 'http-status-codes'
import { generateAPIKey, generateSecretHash } from '../../utils/apiKey'
import { addChatflowsCount } from '../../utils/addChatflowsCount'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { ApiKey } from '../../database/entities/ApiKey'
import { Not, IsNull } from 'typeorm'
import { getWorkspaceSearchOptions } from '../../enterprise/utils/ControllerServiceUtils'
import { v4 as uuidv4 } from 'uuid'

const getAllApiKeysFromDB = async (workspaceId: string, page: number = -1, limit: number = -1) => {
    const appServer = getRunningExpressApp()
    const queryBuilder = appServer.AppDataSource.getRepository(ApiKey).createQueryBuilder('api_key').orderBy('api_key.updatedDate', 'DESC')
    if (page > 0 && limit > 0) {
        queryBuilder.skip((page - 1) * limit)
        queryBuilder.take(limit)
    }
    queryBuilder.andWhere('api_key.workspaceId = :workspaceId', { workspaceId })
    const [data, total] = await queryBuilder.getManyAndCount()
    const keysWithChatflows = await addChatflowsCount(data)

    if (page > 0 && limit > 0) {
        return { total, data: keysWithChatflows }
    } else {
        return keysWithChatflows
    }
}

const getAllApiKeys = async (workspaceId: string, autoCreateNewKey?: boolean, page: number = -1, limit: number = -1) => {
    try {
        let keys = await getAllApiKeysFromDB(workspaceId, page, limit)
        const isEmpty = keys?.total === 0 || (Array.isArray(keys) && keys?.length === 0)
        if (isEmpty && autoCreateNewKey) {
            await createApiKey('DefaultKey', workspaceId)
            keys = await getAllApiKeysFromDB(workspaceId, page, limit)
        }
        return keys
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: apikeyService.getAllApiKeys - ${getErrorMessage(error)}`)
    }
}

const getApiKey = async (apiKey: string) => {
    try {
        const appServer = getRunningExpressApp()
        const currentKey = await appServer.AppDataSource.getRepository(ApiKey).findOneBy({
            apiKey: apiKey
        })
        if (!currentKey) {
            return undefined
        }
        return currentKey
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: apikeyService.getApiKey - ${getErrorMessage(error)}`)
    }
}

const getApiKeyById = async (apiKeyId: string) => {
    try {
        const appServer = getRunningExpressApp()
        const currentKey = await appServer.AppDataSource.getRepository(ApiKey).findOneBy({
            id: apiKeyId
        })
        if (!currentKey) {
            return undefined
        }
        return currentKey
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: apikeyService.getApiKeyById - ${getErrorMessage(error)}`)
    }
}

const createApiKey = async (keyName: string, workspaceId: string) => {
    try {
        const apiKey = generateAPIKey()
        const apiSecret = generateSecretHash(apiKey)
        const appServer = getRunningExpressApp()
        const newKey = new ApiKey()
        newKey.id = uuidv4()
        newKey.apiKey = apiKey
        newKey.apiSecret = apiSecret
        newKey.keyName = keyName
        newKey.workspaceId = workspaceId
        const key = appServer.AppDataSource.getRepository(ApiKey).create(newKey)
        await appServer.AppDataSource.getRepository(ApiKey).save(key)
        return await getAllApiKeysFromDB(workspaceId)
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: apikeyService.createApiKey - ${getErrorMessage(error)}`)
    }
}

// Update api key
const updateApiKey = async (id: string, keyName: string, workspaceId: string) => {
    try {
        const appServer = getRunningExpressApp()
        const currentKey = await appServer.AppDataSource.getRepository(ApiKey).findOneBy({
            id: id,
            workspaceId: workspaceId
        })
        if (!currentKey) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `ApiKey ${currentKey} not found`)
        }
        currentKey.keyName = keyName
        await appServer.AppDataSource.getRepository(ApiKey).save(currentKey)
        return await getAllApiKeysFromDB(workspaceId)
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: apikeyService.updateApiKey - ${getErrorMessage(error)}`)
    }
}

const deleteApiKey = async (id: string, workspaceId: string) => {
    try {
        const appServer = getRunningExpressApp()
        const dbResponse = await appServer.AppDataSource.getRepository(ApiKey).delete({ id, workspaceId })
        if (!dbResponse) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `ApiKey ${id} not found`)
        }
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: apikeyService.deleteApiKey - ${getErrorMessage(error)}`)
    }
}

const importKeys = async (body: any) => {
    try {
        const jsonFile = body.jsonFile
        const workspaceId = body.workspaceId
        const splitDataURI = jsonFile.split(',')
        if (splitDataURI[0] !== 'data:application/json;base64') {
            throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Invalid dataURI`)
        }
        const bf = Buffer.from(splitDataURI[1] || '', 'base64')
        const plain = bf.toString('utf8')
        const keys = JSON.parse(plain)

        // Validate schema of imported keys
        if (!Array.isArray(keys)) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, `Invalid format: Expected an array of API keys`)
        }

        const requiredFields = ['keyName', 'apiKey', 'apiSecret', 'createdAt', 'id']
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i]
            if (typeof key !== 'object' || key === null) {
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, `Invalid format: Key at index ${i} is not an object`)
            }

            for (const field of requiredFields) {
                if (!(field in key)) {
                    throw new InternalFlowiseError(
                        StatusCodes.BAD_REQUEST,
                        `Invalid format: Key at index ${i} is missing required field '${field}'`
                    )
                }
                if (typeof key[field] !== 'string') {
                    throw new InternalFlowiseError(
                        StatusCodes.BAD_REQUEST,
                        `Invalid format: Key at index ${i} field '${field}' must be a string`
                    )
                }
                if (key[field].trim() === '') {
                    throw new InternalFlowiseError(
                        StatusCodes.BAD_REQUEST,
                        `Invalid format: Key at index ${i} field '${field}' cannot be empty`
                    )
                }
            }
        }

        const appServer = getRunningExpressApp()
        const allApiKeys = await appServer.AppDataSource.getRepository(ApiKey).findBy(getWorkspaceSearchOptions(workspaceId))
        if (body.importMode === 'replaceAll') {
            await appServer.AppDataSource.getRepository(ApiKey).delete({
                id: Not(IsNull()),
                workspaceId: workspaceId
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
                    case 'overwriteIfExist':
                    case 'replaceAll': {
                        const currentKey = allApiKeys[keyIndex]
                        currentKey.id = uuidv4()
                        currentKey.apiKey = key.apiKey
                        currentKey.apiSecret = key.apiSecret
                        currentKey.workspaceId = workspaceId
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
                newKey.id = uuidv4()
                newKey.apiKey = key.apiKey
                newKey.apiSecret = key.apiSecret
                newKey.keyName = key.keyName
                newKey.workspaceId = workspaceId
                const newKeyEntity = appServer.AppDataSource.getRepository(ApiKey).create(newKey)
                await appServer.AppDataSource.getRepository(ApiKey).save(newKeyEntity)
            }
        }
        return await getAllApiKeysFromDB(workspaceId)
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: apikeyService.importKeys - ${getErrorMessage(error)}`)
    }
}

const verifyApiKey = async (paramApiKey: string): Promise<string> => {
    try {
        const appServer = getRunningExpressApp()
        const apiKey = await appServer.AppDataSource.getRepository(ApiKey).findOneBy({
            apiKey: paramApiKey
        })
        if (!apiKey) {
            throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, `Unauthorized`)
        }
        return 'OK'
    } catch (error) {
        if (error instanceof InternalFlowiseError && error.statusCode === StatusCodes.UNAUTHORIZED) {
            throw error
        } else {
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
    getApiKeyById,
    importKeys
}
