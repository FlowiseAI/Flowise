import { cloneDeep } from 'lodash'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'

const getAllComponentsCredentials = async () => {
    try {
        const flowXpresApp = getRunningExpressApp()
        const dbResponse: [] = []
        for (const credName in flowXpresApp.nodesPool.componentCredentials) {
            const clonedCred = cloneDeep(flowXpresApp.nodesPool.componentCredentials[credName])
            //@ts-ignore
            dbResponse.push(clonedCred)
        }
        return dbResponse
    } catch (error) {
        throw new Error(`Error: componentsCredentialsService.getAllComponentsCredentials - ${error}`)
    }
}

const getSingleComponentsCredential = async (credentialName: string) => {
    try {
        const flowXpresApp = getRunningExpressApp()
        if (!credentialName.includes('&amp;')) {
            if (Object.prototype.hasOwnProperty.call(flowXpresApp.nodesPool.componentCredentials, credentialName)) {
                return flowXpresApp.nodesPool.componentCredentials[credentialName]
            } else {
                throw new Error(
                    `Error: componentsCredentialsService.getSingleComponentsCredential - Credential ${credentialName} not found`
                )
            }
        } else {
            const dbResponse = []
            for (const name of credentialName.split('&amp;')) {
                if (Object.prototype.hasOwnProperty.call(flowXpresApp.nodesPool.componentCredentials, name)) {
                    dbResponse.push(flowXpresApp.nodesPool.componentCredentials[name])
                } else {
                    throw new Error(`Error: componentsCredentialsService.getSingleComponentsCredential - Credential ${name} not found`)
                }
            }
            return dbResponse
        }
    } catch (error) {
        throw new Error(`Error: componentsCredentialsService.getSingleComponentsCredential - ${error}`)
    }
}

const getSingleComponentsCredentialIcon = async (credentialName: string) => {
    try {
        const flowXpresApp = getRunningExpressApp()
        if (Object.prototype.hasOwnProperty.call(flowXpresApp.nodesPool.componentCredentials, credentialName)) {
            const credInstance = flowXpresApp.nodesPool.componentCredentials[credentialName]
            if (credInstance.icon === undefined) {
                throw new Error(`Credential ${credentialName} icon not found`)
            }

            if (credInstance.icon.endsWith('.svg') || credInstance.icon.endsWith('.png') || credInstance.icon.endsWith('.jpg')) {
                const filepath = credInstance.icon
                return filepath
            } else {
                throw new Error(`Credential ${credentialName} icon is missing icon`)
            }
        } else {
            throw new Error(`Credential ${credentialName} not found`)
        }
    } catch (error) {
        throw new Error(`Error: componentsCredentialsService.getSingleComponentsCredentialIcon - ${error}`)
    }
}

export default {
    getAllComponentsCredentials,
    getSingleComponentsCredential,
    getSingleComponentsCredentialIcon
}
