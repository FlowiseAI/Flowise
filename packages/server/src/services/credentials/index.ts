import { omit } from 'lodash'
import { StatusCodes } from 'http-status-codes'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { Credential } from '../../database/entities/Credential'
import { transformToCredentialEntity, decryptCredentialData } from '../../utils'
import { ICredentialReturnResponse } from '../../Interface'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { IsNull, Like } from 'typeorm'

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

const getAllCredentials = async (paramCredentialName: any, userId?: string, organizationId?: string) => {
    try {
        const appServer = getRunningExpressApp()
        let dbResponse = []
        if (paramCredentialName) {
            if (Array.isArray(paramCredentialName)) {
                for (let i = 0; i < paramCredentialName.length; i += 1) {
                    const name = paramCredentialName[i] as string
                    const credentials = await appServer.AppDataSource.getRepository(Credential).find({
                        where: [
                            {
                                credentialName: name,
                                userId: userId
                            },
                            {
                                credentialName: name,
                                userId: IsNull()
                            }
                        ]
                    })

                    const orgCondition = `
                        Credential.organizationId = :organizationId AND
                        Credential.credentialName = :name AND
                        Credential.visibility LIKE '%Organization%'
                    `
                    const orgCredentials = await appServer.AppDataSource.getRepository(Credential)
                        .createQueryBuilder('Credential')
                        .where(orgCondition, { organizationId, name })
                        .getMany()
                    credentials.push(...orgCredentials)
                    dbResponse.push(...credentials)
                }
            } else {
                const credentials = await appServer.AppDataSource.getRepository(Credential).find({
                    where: [
                        {
                            credentialName: paramCredentialName as string,
                            userId: userId
                        },
                        {
                            credentialName: paramCredentialName as string,
                            userId: IsNull()
                        }
                    ]
                })
                const orgCondition = `
                        Credential.organizationId = :organizationId AND
                        Credential.credentialName = :name AND
                        Credential.visibility LIKE '%Organization%'
                    `
                const orgCredentials = await appServer.AppDataSource.getRepository(Credential)
                    .createQueryBuilder('Credential')
                    .where(orgCondition, { organizationId, name: paramCredentialName as string })
                    .getMany()
                credentials.push(...orgCredentials)
                dbResponse = [...credentials]
            }
        } else {
            const credentials = await appServer.AppDataSource.getRepository(Credential).find({
                where: [
                    {
                        userId
                    },
                    {
                        userId: IsNull()
                    }
                ]
            })
            const orgCondition = `
                        Credential.organizationId = :organizationId AND
                        Credential.visibility LIKE '%Organization%'
            `
            const orgCredentials = await appServer.AppDataSource.getRepository(Credential)
                .createQueryBuilder('Credential')
                .where(orgCondition, { organizationId })
                .getMany()

            dbResponse.push(...orgCredentials)

            for (const credential of credentials) {
                dbResponse.push(omit(credential, ['encryptedData']))
            }
        }
        // Deduplicate credentials based on id
        const uniqueCredentials = Array.from(new Map(dbResponse.map((item) => [item.id, item])).values())

        // Add editable property
        const finalResponse = uniqueCredentials.map((credential) => ({
            ...credential,
            editable: credential.userId === userId
        }))
        return finalResponse
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
            id: credentialId,
            userId
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

export default {
    createCredential,
    deleteCredentials,
    getAllCredentials,
    getCredentialById,
    updateCredential
}
