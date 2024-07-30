import { StatusCodes } from 'http-status-codes'
import { EncryptionCredential } from '../../database/entities/EncryptionCredential'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'

/**
 * Create a new record into encryption_credential table.
 *
 * @param encryptionId - Id from Encryption entity
 * @param credentialId - Id from Credential entity
 * @returns void
 *
 */
const create = async (encryptionId: string, credentialId: string): Promise<void> => {
    try {
        const appServer = getRunningExpressApp()

        // step 1 - create a new variable with class of EncryptionCredential
        const newEncryptionCredential: Partial<EncryptionCredential> = {
            encryptionId: encryptionId,
            credentialId: credentialId
        }

        // step 2 - save new encryptionCredential into database's encryption_credential table
        const insertResponse = await appServer.AppDataSource.getRepository(EncryptionCredential).create(newEncryptionCredential)
        await appServer.AppDataSource.getRepository(EncryptionCredential).save(insertResponse)
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: encryptionCredential.create - ${getErrorMessage(error)}`)
    }
}

/**
 * Find records in `encryption_credential` table by `credentialId`.
 *
 * @param credentialId - Id from Credential entity
 * @returns EncryptionCredential entity array
 *
 * @remarks `EncryptionCredential[].length` should be 0 or 1
 */
const findByCredentialId = async (credentialId: string): Promise<EncryptionCredential[]> => {
    try {
        const appServer = getRunningExpressApp()

        // step 1 - find all encryptionCredential rows by credentialId in database's encryption_credential table
        const findByResponse: EncryptionCredential[] = await appServer.AppDataSource.getRepository(EncryptionCredential).findBy({
            credentialId: credentialId
        })

        // step 2 - console error when encryptionCredential rows is more than 1
        if (findByResponse.length > 1) {
            console.error(
                `credentialId: ${credentialId} have multiple rows in encryption_credential table. 1 credentialId must only have 1 row in encryption_credential table.`
            )
        }

        // step 3 - return encryptionCredential rows
        return findByResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: encryptionCredential.findByCredentialId - ${getErrorMessage(error)}`
        )
    }
}

/**
 * Update `[encryptionId, updatedDate]` columns in the `encryption_credential` table for a specific `credentialId`.
 *
 * @param newEncryptionId - Id from Encryption entity
 * @param credentialId - Id from Credential entity
 * @returns void
 *
 */
const updateEncryptionId = async (newEncryptionId: string, credentialId: string): Promise<void> => {
    try {
        const appServer = getRunningExpressApp()

        // step 1 - update [encryptionId, updatedDate] columns in database's encryption_credential table for a specific credentialId
        await appServer.AppDataSource.getRepository(EncryptionCredential)
            .createQueryBuilder()
            .update(EncryptionCredential)
            .set({ encryptionId: newEncryptionId, updatedDate: () => 'CURRENT_TIMESTAMP' })
            .where('credentialId = :credentialId', { credentialId })
            .execute()
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: encryptionCredential.update - ${getErrorMessage(error)}`)
    }
}

export default {
    create,
    findByCredentialId,
    updateEncryptionId
}
