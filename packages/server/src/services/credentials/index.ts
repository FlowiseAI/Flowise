import { omit } from 'lodash'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { Credential } from '../../database/entities/Credential'

const getAllCredentials = async (paramCredentialName: any) => {
    try {
        const flowXpresApp = getRunningExpressApp()
        let dbResponse = []
        if (paramCredentialName) {
            if (Array.isArray(paramCredentialName)) {
                for (let i = 0; i < paramCredentialName.length; i += 1) {
                    const name = paramCredentialName[i] as string
                    const credentials = await flowXpresApp.AppDataSource.getRepository(Credential).findBy({
                        credentialName: name
                    })
                    dbResponse.push(...credentials)
                }
            } else {
                const credentials = await flowXpresApp.AppDataSource.getRepository(Credential).findBy({
                    credentialName: paramCredentialName as string
                })
                dbResponse = [...credentials]
            }
        } else {
            const credentials = await flowXpresApp.AppDataSource.getRepository(Credential).find()
            for (const credential of credentials) {
                dbResponse.push(omit(credential, ['encryptedData']))
            }
        }
        return dbResponse
    } catch (error) {
        throw new Error(`Error: credentialsService.getAllCredentials - ${error}`)
    }
}

export default {
    getAllCredentials
}
