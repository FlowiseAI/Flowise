import { omit } from 'lodash'
import { Credential } from '../../database/entities/Credential'
import { decryptCredentialData, transformToCredentialEntity } from '../../utils'
import { ICredentialReturnResponse } from '../../Interface'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'

//@ts-ignore
const createCredential = async (requesBody) => {
    try {
        const flowXpresApp = getRunningExpressApp()
        const newCredential = await transformToCredentialEntity(requesBody)
        const credential = await flowXpresApp.AppDataSource.getRepository(Credential).create(newCredential)
        const dbResponse = await flowXpresApp.AppDataSource.getRepository(Credential).save(credential)
        return dbResponse
    } catch (error) {
        throw new Error(`Error: credentialsService.createCredential - ${error}`)
    }
}

const deleteAllCredentials = async (credentialId: string) => {
    try {
        const flowXpresApp = getRunningExpressApp()
        const dbResponse = await flowXpresApp.AppDataSource.getRepository(Credential).delete({ id: credentialId })
        return dbResponse
    } catch (error) {
        throw new Error(`Error: credentialsService.deleteAllCredentials - ${error}`)
    }
}

const getAllCredentials = async (requestCredentialName: string) => {
    try {
        const flowXpresApp = getRunningExpressApp()
        if (requestCredentialName) {
            let dbResponse = []
            if (Array.isArray(requestCredentialName)) {
                for (let i = 0; i < requestCredentialName.length; i += 1) {
                    const name = requestCredentialName[i] as string
                    const credentials = await flowXpresApp.AppDataSource.getRepository(Credential).findBy({
                        credentialName: name
                    })
                    dbResponse.push(...credentials)
                }
            } else {
                const credentials = await flowXpresApp.AppDataSource.getRepository(Credential).findBy({
                    credentialName: requestCredentialName as string
                })
                dbResponse = [...credentials]
            }
            return dbResponse
        } else {
            const credentials = await flowXpresApp.AppDataSource.getRepository(Credential).find()
            const dbResponse = []
            for (const credential of credentials) {
                dbResponse.push(omit(credential, ['encryptedData']))
            }
            return dbResponse
        }
    } catch (error) {
        throw new Error(`Error: credentialsService.getAllCredentials - ${error}`)
    }
}

const getSingleCredential = async (credentialId: string) => {
    try {
        const flowXpresApp = getRunningExpressApp()
        const credential = await flowXpresApp.AppDataSource.getRepository(Credential).findOneBy({
            id: credentialId
        })
        if (!credential)
            return {
                executionError: true,
                status: 404,
                msg: `Credential ${credentialId} not found in the database!`
            }
        // Decrpyt credentialData
        const decryptedCredentialData = await decryptCredentialData(
            credential.encryptedData,
            credential.credentialName,
            flowXpresApp.nodesPool.componentCredentials
        )
        const returnCredential: ICredentialReturnResponse = {
            ...credential,
            plainDataObj: decryptedCredentialData
        }
        const dbResponse = omit(returnCredential, ['encryptedData'])
        return dbResponse
    } catch (error) {
        throw new Error(`Error: credentialsService.getSingleCredential - ${error}`)
    }
}

//@ts-ignore
const updateCredential = async (credentialId: string, requestBody) => {
    try {
        const flowXpresApp = getRunningExpressApp()
        const credential = await flowXpresApp.AppDataSource.getRepository(Credential).findOneBy({
            id: credentialId
        })
        if (!credential)
            return {
                executionError: true,
                status: 404,
                msg: `Credential ${credentialId} not found`
            }
        const updateCredential = await transformToCredentialEntity(requestBody)
        await flowXpresApp.AppDataSource.getRepository(Credential).merge(credential, updateCredential)
        const dbResponse = await flowXpresApp.AppDataSource.getRepository(Credential).save(credential)
        return dbResponse
    } catch (error) {
        throw new Error(`Error: credentialsService.updateCredential - ${error}`)
    }
}

export default {
    createCredential,
    deleteAllCredentials,
    getAllCredentials,
    getSingleCredential,
    updateCredential
}
