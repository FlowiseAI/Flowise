import { omit } from 'lodash'
import { StatusCodes } from 'http-status-codes'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { Credential } from '../../database/entities/Credential'
import { transformToCredentialEntity, decryptCredentialData } from '../../utils'
import { ICredentialReturnResponse, IUser } from '../../Interface'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { FindOptionsWhere, IsNull, Like } from 'typeorm'
import { GoogleOauth2Client } from '../../utils/refreshGoogleAccessToken'

const createCredential = async (requestBody: any, userId?: string, organizationId?: string) => {
    try {
        const appServer = getRunningExpressApp()
        const newCredential = await transformToCredentialEntity(requestBody)
        newCredential.userId = userId
        newCredential.organizationId = organizationId
        const credential = await appServer.AppDataSource.getRepository(Credential).create(newCredential)
        const dbResponse = await appServer.AppDataSource.getRepository(Credential).save(credential)
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: credentialsService.createCredential - ${getErrorMessage(error)}`
        )
    }
}

// Delete all credentials from chatflowid
const deleteCredentials = async (credentialId: string, userId?: string): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const dbResponse = await appServer.AppDataSource.getRepository(Credential).delete({ id: credentialId, userId })
        if (!dbResponse) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Credential ${credentialId} not found`)
        }
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: credentialsService.deleteCredential - ${getErrorMessage(error)}`
        )
    }
}

const getAllCredentials = async (paramCredentialName: any, user: IUser) => {
    try {
        const appServer = getRunningExpressApp()
        const credentialRepo = appServer.AppDataSource.getRepository(Credential)

        const isAdmin = user?.roles?.includes('Admin')

        // This function fetches credentials based on different ownership levels:
        // 1. User-specific credentials (linked to userId)
        // 2. Global credentials (userId is null)
        // 3. Organization-wide credentials (linked to organizationId)
        // 4. All organization credentials if user is admin
        const fetchCredentials = async (name?: string) => {
            let baseConditions = []

            // If name is provided, only fetch owned credentials
            if (!name && isAdmin) {
                // Admin can see all organization credentials
                baseConditions = [{ organizationId: user.organizationId }, { userId: IsNull() }]
            } else {
                baseConditions = [
                    { userId: user.id },
                    { userId: IsNull() },
                    {
                        organizationId: user.organizationId,
                        visibility: Like('%Organization%')
                    }
                ]
            }

            const conditions = name ? baseConditions.map((condition) => ({ ...condition, credentialName: name })) : baseConditions

            return credentialRepo.find({
                where: conditions as FindOptionsWhere<Credential> | FindOptionsWhere<Credential>[]
            })
        }

        let credentials: Credential[] = []

        // The paramCredentialName parameter affects the retrieval logic:
        // - If provided as an array, it fetches credentials for each name in the array
        // - If provided as a single string, it fetches credentials matching that specific name
        // - If not provided (null/undefined), it fetches all accessible credentials
        if (Array.isArray(paramCredentialName)) {
            for (const name of paramCredentialName) {
                credentials.push(...(await fetchCredentials(name)))
            }
        } else if (paramCredentialName) {
            credentials = await fetchCredentials(paramCredentialName)
        } else {
            credentials = await fetchCredentials()
        }

        // Remove sensitive data from user-specific credentials
        const sanitizedCredentials = credentials.map((credential) => (credential.userId ? omit(credential, ['encryptedData']) : credential))

        // Deduplicate credentials based on id
        const uniqueCredentials = Array.from(new Map(sanitizedCredentials.map((item) => [item.id, item])).values())

        // Add isOwner property to indicate if the current user owns the credential
        return uniqueCredentials.map((credential) => ({
            ...credential,
            isOwner: credential.userId === user.id
        }))
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: credentialsService.getAllCredentials - ${getErrorMessage(error)}`
        )
    }
}

const getCredentialById = async (credentialId: string, userId?: string): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        // TODO: Check if necessary to filter by userId
        const credential = await appServer.AppDataSource.getRepository(Credential).findOneBy({
            id: credentialId
            // userId
        })
        if (!credential) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Credential ${credentialId} not found`)
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
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: credentialsService.getCredentialById - ${getErrorMessage(error)}`
        )
    }
}

const updateCredential = async (credentialId: string, requestBody: any, userId?: string, organizationId?: string): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const credential = await appServer.AppDataSource.getRepository(Credential).findOneBy({
            id: credentialId
        })
        if (!credential) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Credential ${credentialId} not found`)
        }
        const decryptedCredentialData = await decryptCredentialData(credential.encryptedData)
        requestBody.plainDataObj = { ...decryptedCredentialData, ...requestBody.plainDataObj }
        requestBody.organizationId = organizationId
        const updateCredential = await transformToCredentialEntity(requestBody)
        await appServer.AppDataSource.getRepository(Credential).merge(credential, updateCredential)
        const dbResponse = await appServer.AppDataSource.getRepository(Credential).save(credential)
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: credentialsService.updateCredential - ${getErrorMessage(error)}`
        )
    }
}

const updateAndRefreshToken = async (credentialId: string, userId?: string): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const credential = await appServer.AppDataSource.getRepository(Credential).findOneBy({ id: credentialId })
        if (!credential) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Credential ${credentialId} not found`)
        }
        const decryptedCredentialData = await decryptCredentialData(credential.encryptedData)
        const googleOauth2Client = new GoogleOauth2Client({
            googleAccessToken: decryptedCredentialData.googleAccessToken,
            googleRefreshToken: decryptedCredentialData.googleRefreshToken
        })
        const { access_token, expiry_date } = await googleOauth2Client.refreshToken()

        const updateBody = {
            name: credential.name,
            credentialName: credential.credentialName,
            plainDataObj: {
                ...decryptedCredentialData,
                googleAccessToken: access_token,  // ✅ ACTUALIZA el nuevo access token
                expiresAt: new Date(expiry_date)  // ✅ ACTUALIZA la fecha de expiración
                // expiresAt: new Date(Date.now() + 1 * 60 * 1000)
            },
            userId: credential.userId,
            organizationId: credential.organizationId
        }
        const updateCredentialEntity = await transformToCredentialEntity(updateBody)
        await appServer.AppDataSource.getRepository(Credential).merge(credential, updateCredentialEntity)
        const dbResponse = await appServer.AppDataSource.getRepository(Credential).save(credential)
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: credentialsService.updateRefreshToken - ${getErrorMessage(error)}`
        )
    }
}

export default {
    createCredential,
    deleteCredentials,
    getAllCredentials,
    getCredentialById,
    updateCredential,
    updateAndRefreshToken
}
