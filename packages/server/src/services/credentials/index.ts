import { ICommonObject } from 'flowise-components'
import { StatusCodes } from 'http-status-codes'
import { omit } from 'lodash'
import { DeleteResult } from 'typeorm'
import { ICredentialReqBody, ICredentialReturnResponse } from '../../Interface'
import { Credential } from '../../database/entities/Credential'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { decryptCredentialData } from '../../utils'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import encryption from '../encryption'
import encryptionCredential from '../encryptionCredential'

/**
 * Create a new record into `encryption_credential` and `credential` table.
 *
 * @param requestBody - ICredentialReqBody interface
 * @returns `Credential`
 *
 */
const createCredential = async (requestBody: any): Promise<Credential> => {
    try {
        const appServer = getRunningExpressApp()
        const queryRunner = appServer.AppDataSource.createQueryRunner()
        try {
            // step 1 - start transaction
            await queryRunner.startTransaction()

            // step 2 - transform requestBody to Credential entity and get encryptionId if any
            const credentialEntity = await transformToCredentialEntity(requestBody)

            // step 3 - create new record for credential table
            const credential = await appServer.AppDataSource.getRepository(Credential).create(credentialEntity.newCredential)
            const dbResponse = await appServer.AppDataSource.getRepository(Credential).save(credential)

            // step 4 - create new record for encryptionCredential table
            if (credentialEntity.encryptionId) await encryptionCredential.create(credentialEntity.encryptionId, credential.id)

            // step 5 - commit transaction
            await queryRunner.commitTransaction()

            // step 6 - return credential
            return dbResponse
        } catch (error) {
            // step 6 - rollback transaction when error occur
            await queryRunner.rollbackTransaction()
            throw error
        } finally {
            queryRunner.release()
        }
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: credentialsService.createCredential - ${getErrorMessage(error)}`
        )
    }
}

/**
 * Delete rows in the `encryption_credential` and `credential` table for a specific `credentialId`.
 *
 * @param credentialId - Id from Credential entity
 * @returns `DeleteResult`
 *
 */
const deleteCredentials = async (credentialId: string): Promise<DeleteResult> => {
    try {
        const appServer = getRunningExpressApp()
        const queryRunner = appServer.AppDataSource.createQueryRunner()
        try {
            // step 1 - start transaction
            queryRunner.startTransaction()

            // step 2 - delete rows in encryption_credential table with credential id
            await encryptionCredential.deleteByCredentialId(credentialId)

            // step 3 - delete rows in credential table with credential id
            const deleteResult = await appServer.AppDataSource.getRepository(Credential).delete({ id: credentialId })
            if (!deleteResult) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Credential ${credentialId} not found`)

            // step 4 - commit transaction
            queryRunner.commitTransaction()

            // step 5 - return delete result
            return deleteResult
        } catch (error) {
            // step 5 - rollback transaction when error occur
            queryRunner.rollbackTransaction()
            throw error
        } finally {
            queryRunner.release()
        }
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: credentialsService.deleteCredential - ${getErrorMessage(error)}`
        )
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
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: credentialsService.getAllCredentials - ${getErrorMessage(error)}`
        )
    }
}

const getCredentialById = async (credentialId: string): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const credential = await appServer.AppDataSource.getRepository(Credential).findOneBy({
            id: credentialId
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
            `Error: credentialsService.createCredential - ${getErrorMessage(error)}`
        )
    }
}

/**
 * Delete rows in the `encryption_credential` and `credential` table for a specific `credentialId`.
 * Update a row for a specific credentialId.
 *
 * @param credentialId - Id from Credential entity
 * @param requestBody - ICredentialReqBody interface
 * @returns `DeleteResult`
 *
 */
const updateCredential = async (credentialId: string, requestBody: any): Promise<Credential> => {
    try {
        const appServer = getRunningExpressApp()
        const queryRunner = appServer.AppDataSource.createQueryRunner()
        try {
            queryRunner.startTransaction()
            // step 1 - check whether credential id exist
            const credential = await appServer.AppDataSource.getRepository(Credential).findOneBy({ id: credentialId })
            if (!credential) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Credential ${credentialId} not found`)

            // step 2 - decrypt encrypted data
            const decryptedCredentialData = await encryption.decrypt(credential)

            // step 3 - Prep requestBody to acceptable format for update
            requestBody.plainDataObj = { ...decryptedCredentialData.plainDataObj, ...requestBody.plainDataObj }
            const credentialEntity = await transformToCredentialEntity(requestBody)

            // step 4 - Update credential
            await appServer.AppDataSource.getRepository(Credential).merge(credential, credentialEntity.newCredential)
            const updatedCredential = await appServer.AppDataSource.getRepository(Credential).save(credential)

            // step 5 - commit transaction
            queryRunner.commitTransaction()

            // step 6 - return updated credential
            return updatedCredential
        } catch (error) {
            // step 5 - rollback transaction
            queryRunner.rollbackTransaction()
            throw error
        } finally {
            queryRunner.release()
        }
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: credentialsService.updateCredential - ${getErrorMessage(error)}`
        )
    }
}

/**
 * Update `[isEncryptionKeyLost, updatedDate]` columns in `credential` table for a specific `credentialId`.
 *
 * @param credentialId - Id from Credential entity
 * @param isEncryptionKeyLost - isEncryptionKeyLost from Credential entity
 * @returns void
 *
 */
const updateIsEncryptionKeyLost = async (credentialId: string, isEncryptionKeyLost: boolean): Promise<void> => {
    try {
        const appServer = getRunningExpressApp()

        // step 1 - update [isEncryptionKeyLost, updatedDate] columns in database's credential table for a specific credentialId
        await appServer.AppDataSource.getRepository(Credential)
            .createQueryBuilder()
            .update(Credential)
            .set({ isEncryptionKeyLost: isEncryptionKeyLost, updatedDate: () => 'CURRENT_TIMESTAMP' })
            .where('id = :credentialId', { credentialId })
            .execute()
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: credentialsService.updateIsEncryptionKeyLost - ${getErrorMessage(error)}`
        )
    }
}

/**
 * Transform ICredentialBody from req to Credential entity and return encryptionId if any.
 *
 * @param body - ICredentialReqBody interface
 * @returns Credential | {encryptionId: string, newCredential: credential}
 *
 * @remarks if `encryptionId` might be `null`
 */
const transformToCredentialEntity = async (body: ICredentialReqBody) => {
    try {
        // step 1 - initialize name and credentialName
        const credentialBody: ICommonObject = {
            name: body.name,
            credentialName: body.credentialName
        }

        // step 2 - initialize encryptionId as null
        let encryptionId: null | string = null
        if (body.plainDataObj) {
            // step 2 - get information of encryption result and encryptionId
            const encryptionResult = await encryption.encrypt(body.plainDataObj)
            credentialBody.encryptedData = encryptionResult.encryptedData
            encryptionId = encryptionResult.encryption.id
        }

        // step 3 - assign credentialBody to newCredential object
        const newCredential = new Credential()
        Object.assign(newCredential, credentialBody)

        // step 4 - return newCredential and encryptionId if any
        return { encryptionId, newCredential }
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: credentialsService.transformToCredentialEntity - ${getErrorMessage(error)}`
        )
    }
}

export default {
    createCredential,
    deleteCredentials,
    getAllCredentials,
    getCredentialById,
    updateCredential,
    updateIsEncryptionKeyLost
}
