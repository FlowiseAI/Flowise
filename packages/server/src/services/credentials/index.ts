import { omit } from 'lodash'
import { StatusCodes } from 'http-status-codes'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { Credential } from '../../database/entities/Credential'
import { transformToCredentialEntity, decryptCredentialData } from '../../utils'
import { ICredentialReturnResponse } from '../../Interface'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { User, UserRole } from '../../database/entities/User'

const createCredential = async (req: any) => {
  try {
    const { body, user } = req
    if (!user.id) {
      throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'Error: documentStoreServices.getAllDocumentStores - User not found')
    }
    const appServer = getRunningExpressApp()
    const foundUser = await appServer.AppDataSource.getRepository(User).findOneBy({ id: user.id })
    if (!foundUser) {
      throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'Error: documentStoreServices.getAllDocumentStores - User not found')
    }
    const newCredential = await transformToCredentialEntity(body)
    const credential = appServer.AppDataSource.getRepository(Credential).create({ ...newCredential, userId: foundUser.id })
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
const deleteCredentials = async (credentialId: string): Promise<any> => {
  try {
    const appServer = getRunningExpressApp()
    const dbResponse = await appServer.AppDataSource.getRepository(Credential).delete({ id: credentialId })
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

const getAllCredentials = async (req: any) => {
  try {
    const { user } = req
    const paramCredentialName = req.query.credentialName
    if (!user.id) {
      throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'Error: documentStoreServices.getAllDocumentStores - User not found')
    }

    const appServer = getRunningExpressApp()
    const foundUser = await appServer.AppDataSource.getRepository(User).findOneBy({ id: user.id })
    if (!foundUser) {
      throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'Error: documentStoreServices.getAllDocumentStores - User not found')
    }
    let dbResponse = []
    if (paramCredentialName) {
      if (Array.isArray(paramCredentialName)) {
        for (let i = 0; i < paramCredentialName.length; i += 1) {
          const name = paramCredentialName[i] as string
          let credentials
          credentials = await appServer.AppDataSource.getRepository(Credential).findBy({
            credentialName: name,
            userId: foundUser.id
          })
          dbResponse.push(...credentials)
        }
      } else {
        let credentials
        credentials = await appServer.AppDataSource.getRepository(Credential).findBy({
          credentialName: paramCredentialName as string,
          userId: foundUser.id
        })
        dbResponse = [...credentials]
      }
    } else {
      let credentials
      credentials = await appServer.AppDataSource.getRepository(Credential).findBy({ userId: foundUser.id })
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

const getCredentialById = async (req: any): Promise<any> => {
  try {
    const { user } = req
    const credentialId = req.params.id
    const appServer = getRunningExpressApp()

    if (!user.id) {
      throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'Error: documentStoreServices.getAllDocumentStores - User not found')
    }
    const foundUser = await appServer.AppDataSource.getRepository(User).findOneBy({ id: user.id })
    if (!foundUser) {
      throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'Error: documentStoreServices.getAllDocumentStores - User not found')
    }
    let credential
    if (foundUser.role !== UserRole.MASTER_ADMIN) {
      credential = await appServer.AppDataSource.getRepository(Credential).findOneBy({
        id: credentialId,
        userId: user.id
      })
    } else {
      credential = await appServer.AppDataSource.getRepository(Credential).findOneBy({
        id: credentialId
      })
    }
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

const updateCredential = async (credentialId: string, requestBody: any): Promise<any> => {
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
