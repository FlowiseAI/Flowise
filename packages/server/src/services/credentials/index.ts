import { omit } from 'lodash'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { Credential } from '../../database/entities/Credential'
import { transformToCredentialEntity, decryptCredentialData } from '../../utils'
import { ICredentialReturnResponse } from '../../Interface'
import { ApiError } from '../../errors/apiError'
import { StatusCodes } from 'http-status-codes'

const createCredential = async (requestBody: any) => {
    try {
        const appServer = getRunningExpressApp()
        const newCredential = await transformToCredentialEntity(requestBody)
        const credential = await appServer.AppDataSource.getRepository(Credential).create(newCredential)
        const dbResponse = await appServer.AppDataSource.getRepository(Credential).save(credential)
        return dbResponse
    } catch (error) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: credentialsService.createCredential - ${error}`)
    }
}

// Delete all credentials from chatflowid
const deleteCredentials = async (credentialId: string): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const dbResponse = await appServer.AppDataSource.getRepository(Credential).delete({ id: credentialId })
        if (!dbResponse) {
            throw new ApiError(StatusCodes.NOT_FOUND, `Credential ${credentialId} not found`)
        }
        return dbResponse
    } catch (error) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: credentialsService.deleteCredential - ${error}`)
    }
}

const getAllCredentials = async (paramCredentialName: any) => {
    try {
        const appServer = getRunningExpressApp()
        let dbResponse = []
        if (paramCredentialName) {
            if (Array.isArray(paramCredentialName)) {
                for (let i = 0; i < paramCredentialName.length; i += 1) {
                    const name = paramCredentialName[i] as string
                    const credentials = await appServer.AppDataSource.getRepository(Credential).findBy({
                        credentialName: name
                    })
                    dbResponse.push(...credentials)
                }
            } else {
                const credentials = await appServer.AppDataSource.getRepository(Credential).findBy({
                    credentialName: paramCredentialName as string
                })
                dbResponse = [...credentials]
            }
        } else {
            const credentials = await appServer.AppDataSource.getRepository(Credential).find()
            for (const credential of credentials) {
                dbResponse.push(omit(credential, ['encryptedData']))
            }
        }
        return dbResponse
    } catch (error) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: credentialsService.getAllCredentials - ${error}`)
    }
}

const getCredentialById = async (credentialId: string): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const credential = await appServer.AppDataSource.getRepository(Credential).findOneBy({
            id: credentialId
        })
        if (!credential) {
            throw new ApiError(StatusCodes.NOT_FOUND, `Credential ${credentialId} not found`)
        }
        // Decrpyt credentialData
        const decryptedCredentialData = await decryptCredentialData(
            credential.encryptedData,
            credential.credentialName,
            appServer.nodesPool.componentCredentials
        )
        const returnCredential: ICredentialReturnResponse = {
            ...credential,
            plainDataObj: decryptedCredentialData
        }
        const dbResponse = omit(returnCredential, ['encryptedData'])
        return dbResponse
    } catch (error) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: credentialsService.createCredential - ${error}`)
    }
}

const updateCredential = async (credentialId: string, requestBody: any): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const credential = await appServer.AppDataSource.getRepository(Credential).findOneBy({
            id: credentialId
        })
        if (!credential) {
            throw new ApiError(StatusCodes.NOT_FOUND, `Credential ${credentialId} not found`)
        }
        const updateCredential = await transformToCredentialEntity(requestBody)
        await appServer.AppDataSource.getRepository(Credential).merge(credential, updateCredential)
        const dbResponse = await appServer.AppDataSource.getRepository(Credential).save(credential)
        return dbResponse
    } catch (error) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: credentialsService.updateCredential - ${error}`)
    }
}

export default {
    createCredential,
    deleteCredentials,
    getAllCredentials,
    getCredentialById,
    updateCredential
}
