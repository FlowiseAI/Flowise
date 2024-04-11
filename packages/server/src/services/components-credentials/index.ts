import { cloneDeep } from 'lodash'
import { StatusCodes } from 'http-status-codes'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'

// Get all component credentials
const getAllComponentsCredentials = async (): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const dbResponse = []
        for (const credName in appServer.nodesPool.componentCredentials) {
            const clonedCred = cloneDeep(appServer.nodesPool.componentCredentials[credName])
            dbResponse.push(clonedCred)
        }
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: componentsCredentialsService.getAllComponentsCredentials - ${getErrorMessage(error)}`
        )
    }
}

const getComponentByName = async (credentialName: string) => {
    try {
        const appServer = getRunningExpressApp()
        if (!credentialName.includes('&amp;')) {
            if (Object.prototype.hasOwnProperty.call(appServer.nodesPool.componentCredentials, credentialName)) {
                return appServer.nodesPool.componentCredentials[credentialName]
            } else {
                throw new InternalFlowiseError(
                    StatusCodes.NOT_FOUND,
                    `Error: componentsCredentialsService.getSingleComponentsCredential - Credential ${credentialName} not found`
                )
            }
        } else {
            const dbResponse = []
            for (const name of credentialName.split('&amp;')) {
                if (Object.prototype.hasOwnProperty.call(appServer.nodesPool.componentCredentials, name)) {
                    dbResponse.push(appServer.nodesPool.componentCredentials[name])
                } else {
                    throw new InternalFlowiseError(
                        StatusCodes.NOT_FOUND,
                        `Error: componentsCredentialsService.getSingleComponentsCredential - Credential ${name} not found`
                    )
                }
            }
            return dbResponse
        }
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: componentsCredentialsService.getSingleComponentsCredential - ${getErrorMessage(error)}`
        )
    }
}

// Returns specific component credential icon via name
const getSingleComponentsCredentialIcon = async (credentialName: string) => {
    try {
        const appServer = getRunningExpressApp()
        if (Object.prototype.hasOwnProperty.call(appServer.nodesPool.componentCredentials, credentialName)) {
            const credInstance = appServer.nodesPool.componentCredentials[credentialName]
            if (credInstance.icon === undefined) {
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Credential ${credentialName} icon not found`)
            }

            if (credInstance.icon.endsWith('.svg') || credInstance.icon.endsWith('.png') || credInstance.icon.endsWith('.jpg')) {
                const filepath = credInstance.icon
                return filepath
            } else {
                throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Credential ${credentialName} icon is missing icon`)
            }
        } else {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Credential ${credentialName} not found`)
        }
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: componentsCredentialsService.getSingleComponentsCredentialIcon - ${getErrorMessage(error)}`
        )
    }
}

export default {
    getAllComponentsCredentials,
    getComponentByName,
    getSingleComponentsCredentialIcon
}
