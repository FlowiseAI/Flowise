import axios, { AxiosResponse } from 'axios'
import { omit } from 'lodash'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getCredentialData, getCredentialParam } from '../../../src'

import { DirectoryLoader } from '../Folder/DirectoryLoader'
import { getFileLoaders } from '../Folder/directoryLoaderUtils'
import { TextSplitter } from 'langchain/text_splitter'

import * as fsDefault from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { promisify } from 'util'
import * as stream from 'stream'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { v4 as uuid } from 'uuid'
import { URL } from 'url'
// Note: p-limit is imported dynamically below

interface SharepointObjectProperties {
    name: string
    serverRelativeUrl: string
}

class Sharepoint_DocumentLoaders implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'Sharepoint Folder'
        this.name = 'sharepointFolder'
        this.version = 1.0
        this.type = 'Document'
        this.icon = 'sharepoint.svg'
        this.category = 'Document Loaders'
        this.description = `Load data from a Sharepoint folder`
        this.baseClasses = [this.type]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['sharepointApi']
        }
        this.inputs = [
            {
                label: 'Text Splitter',
                name: 'textSplitter',
                type: 'TextSplitter',
                optional: true
            },
            {
                label: 'Site URL',
                name: 'siteUrl',
                type: 'string',
                placeholder: 'https://tenantname.sharepoint.com/sites/sitename'
            },
            {
                label: 'Folder Name',
                name: 'folderName',
                type: 'string',
                placeholder: 'Shared Documents/Wave Dataset'
            },
            {
                label: 'Recursive',
                name: 'recursive',
                type: 'boolean'
            },
            {
                label: 'Pdf Usage',
                name: 'pdfUsage',
                type: 'options',
                options: [
                    {
                        label: 'One document per page',
                        name: 'perPage'
                    },
                    {
                        label: 'One document per file',
                        name: 'perFile'
                    }
                ],
                default: 'perPage',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Token Lifetime',
                name: 'tokenLifetime',
                type: 'string',
                description:
                    'The amount of time in which the computed JWT will be accepted for processing while loading documents. Default is 300 seconds.',
                placeholder: '300',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Access Token Request Scope',
                name: 'tokenRequestScope',
                type: 'string',
                description: 'Resource identifier (application ID URI) of the desired resource, affixed with the .default suffix',
                placeholder: 'https://gorafttech.sharepoint.com/.default',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Additional Metadata',
                name: 'metadata',
                type: 'json',
                description: 'Additional metadata to be added to the extracted documents',
                optional: true,
                additionalParams: true
            },
            {
                label: 'Omit Metadata Keys',
                name: 'omitMetadataKeys',
                type: 'string',
                rows: 4,
                description:
                    'Each document loader comes with a default set of metadata keys that are extracted from the document. You can use this field to omit some of the default metadata keys. The value should be a list of keys, seperated by comma. Use * to omit all metadata keys execept the ones you specify in the Additional Metadata field',
                placeholder: 'key1, key2, key3.nestedKey1',
                optional: true,
                additionalParams: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const textSplitter = nodeData.inputs?.textSplitter as TextSplitter
        const siteUrl = nodeData.inputs?.siteUrl.replace(/\/$/, '') as string
        const folderName = nodeData.inputs?.folderName as string
        const recursive = nodeData.inputs?.recursive as boolean
        const pdfUsage = nodeData.inputs?.pdfUsage
        const tokenLifetime = nodeData.inputs?.tokenLifetime as string
        const tokenRequestScope = nodeData.inputs?.tokenRequestScope as string
        const metadata = nodeData.inputs?.metadata
        const _omitMetadataKeys = nodeData.inputs?.omitMetadataKeys as string

        let omitMetadataKeys: string[] = []
        if (_omitMetadataKeys) {
            omitMetadataKeys = _omitMetadataKeys.split(',').map((key) => key.trim())
        }

        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const tenantId = getCredentialParam('tenantId', credentialData, nodeData)
        const clientId = getCredentialParam('clientId', credentialData, nodeData)
        const clientCertB64 = getCredentialParam('certificate', credentialData, nodeData)
        const clientKeyB64 = getCredentialParam('privateKey', credentialData, nodeData)

        const clientCert = Buffer.from(clientCertB64, 'base64').toString('utf8')
        const clientKey = Buffer.from(clientKeyB64, 'base64').toString('utf8')
        const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`

        // build the request scope needed to request an access token or set the one provided
        const scopeUrl = new URL(siteUrl)
        const requestScope = tokenRequestScope ? tokenRequestScope : `${scopeUrl.protocol}//${scopeUrl.hostname}/.default`

        const tempDir = fsDefault.mkdtempSync(path.join(os.tmpdir(), 'sharepointfileloader-'))

        const loaders = getFileLoaders(pdfUsage)
        try {
            // compute the assertion, pass to token request endpoint to get access token
            const accessToken = await requestAccessToken(
                tokenUrl,
                clientId,
                computeAssertion(tokenUrl, clientId, clientCert, clientKey, parseInt(tokenLifetime)),
                requestScope
            )

            // construct a list of all files to be downloaded
            const fileList: SharepointObjectProperties[] = await fetchFileList(siteUrl, folderName, accessToken, recursive)

            // filter out file extensions that are not supported by the DirectoryLoader
            const fileExtensions = Object.keys(loaders)
            const filteredFileList: SharepointObjectProperties[] = fileList.filter((file) =>
                fileExtensions.includes(file.name.substring(file.name.lastIndexOf('.')))
            )

            // Dynamically import p-limit instead of static import
            const pLimitModule = await import('p-limit')
            const pLimit = pLimitModule.default

            // download all files in list
            // TODO: batch download requests, see: https://learn.microsoft.com/en-us/sharepoint/dev/sp-add-ins/make-batch-requests-with-the-rest-apis
            const limitDownloadRequests = pLimit(10)
            await Promise.all(
                filteredFileList.map(
                    async (fileProperties: SharepointObjectProperties) =>
                        await limitDownloadRequests(async () => {
                            await downloadFile(
                                siteUrl,
                                path.join(tempDir, fileProperties.name),
                                fileProperties.serverRelativeUrl,
                                accessToken
                            )
                        })
                )
            )
        } catch (e) {
            fsDefault.rmSync(tempDir, { recursive: true })
            throw new Error(`An error occurred attempting to download files from folder ${folderName}: ${e.message}`)
        }

        try {
            const loader = new DirectoryLoader(tempDir, loaders, true)

            let docs = []

            if (textSplitter) {
                docs = await loader.loadAndSplit(textSplitter)
            } else {
                docs = await loader.load()
            }

            if (metadata) {
                const parsedMetadata = typeof metadata === 'object' ? metadata : JSON.parse(metadata)
                docs = docs.map((doc) => ({
                    ...doc,
                    metadata:
                        _omitMetadataKeys === '*'
                            ? {
                                  ...parsedMetadata
                              }
                            : omit(
                                  {
                                      ...doc.metadata,
                                      ...parsedMetadata
                                  },
                                  omitMetadataKeys
                              )
                }))
            } else {
                docs = docs.map((doc) => ({
                    ...doc,
                    metadata:
                        _omitMetadataKeys === '*'
                            ? {}
                            : omit(
                                  {
                                      ...doc.metadata
                                  },
                                  omitMetadataKeys
                              )
                }))
            }

            // remove the temp directory before returning docs
            fsDefault.rmSync(tempDir, { recursive: true })

            return docs
        } catch (e) {
            fsDefault.rmSync(tempDir, { recursive: true })
            throw new Error(`An error occurred loading files using directory loader: ${e.message}`)
        }
    }
}

const computeAssertion = (tokenUrl: string, clientId: string, clientCert: string, clientKey: string, tokenLifetime: number): string => {
    // NOTE: assertion is computed according to this documentation: https://learn.microsoft.com/en-us/entra/identity-platform/certificate-credentials
    const x509 = new crypto.X509Certificate(clientCert)
    let x5tClaim = crypto.createHash('sha1').update(x509.raw).digest('base64url')

    let nowSeconds = Math.round(new Date().getTime() / 1000)
    let expirationTime = nowSeconds + (tokenLifetime ? tokenLifetime : 300)

    return jwt.sign(
        {
            aud: tokenUrl,
            exp: expirationTime,
            nbf: nowSeconds,
            iss: clientId,
            jti: uuid(),
            sub: clientId,
            iat: nowSeconds
        },
        clientKey,
        {
            algorithm: 'RS256',
            header: {
                alg: 'RS256',
                typ: 'JWT',
                x5t: x5tClaim
            }
        }
    )
}

const requestAccessToken = async (
    tokenUrl: string,
    clientId: string,
    clientAssertion: string,
    tokenRequestScope: string
): Promise<string> => {
    // NOTE: Request client creds based on https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow#second-case-access-token-request-with-a-certificate
    const tokenResponse = await axios.post(
        tokenUrl,
        {
            grant_type: `client_credentials`,
            client_assertion_type: `urn:ietf:params:oauth:client-assertion-type:jwt-bearer`,
            client_assertion: clientAssertion,
            client_id: clientId,
            scope: tokenRequestScope
        },
        {
            headers: {
                'content-type': 'application/x-www-form-urlencoded'
            }
        }
    )

    return tokenResponse.data['access_token']
}

const fetchFileList = async (
    baseUrl: string,
    folderName: string,
    accessToken: string,
    recursive: boolean
): Promise<SharepointObjectProperties[]> => {
    // TODO: batch file and folder requests, see: https://learn.microsoft.com/en-us/sharepoint/dev/sp-add-ins/make-batch-requests-with-the-rest-apis

    // get files in the current folder
    let filePropertiesArray: SharepointObjectProperties[] = []
    let filesUrl = `${baseUrl}/_api/web/GetFolderByServerRelativeUrl('${folderName}')/Files`
    try {
        const fileListResponse = await retryWithExponentialBackoff(makeGetRequest, filesUrl, accessToken)
        filePropertiesArray = fileListResponse.data.d.results
            .filter((result: any) => result)
            .map(
                (result: any) =>
                    <SharepointObjectProperties>{
                        name: result.Name,
                        serverRelativeUrl: result.ServerRelativeUrl
                    }
            )
    } catch (e: any) {
        console.warn(`Could not get file list from url ${filesUrl} : ${e.message}`)
    }

    if (recursive) {
        // get the list of folders in the current folder
        let awaitedFilesInFolders: SharepointObjectProperties[] = []
        let foldersUrl = `${baseUrl}/_api/web/GetFolderByServerRelativeUrl('${folderName}')/Folders`

        try {
            // Dynamically import p-limit instead of static import
            const pLimitModule = await import('p-limit')
            const pLimit = pLimitModule.default
            
            const limitFolderRequests = pLimit(5)
            const folderListResponse = await retryWithExponentialBackoff(makeGetRequest, foldersUrl, accessToken)
            awaitedFilesInFolders = await Promise.all(
                folderListResponse.data.d.results
                    .filter((result: any) => result)
                    .flatMap(
                        async (result: any) =>
                            await limitFolderRequests(
                                async () => await fetchFileList(baseUrl, result.ServerRelativeUrl, accessToken, recursive)
                            )
                    )
            )
        } catch (e: any) {
            console.warn(`Could not get folder list from url ${foldersUrl} : ${e.message}`)
        }

        // flatten and concatenate the resolved values
        filePropertiesArray = filePropertiesArray.concat(awaitedFilesInFolders.flat())
    }

    return filePropertiesArray
}

const makeGetRequest = async (url: string, accessToken: string): Promise<AxiosResponse<any, any>> => {
    return await axios.get(url, {
        headers: {
            Accept: 'application/json;odata=verbose',
            Authorization: `Bearer ${accessToken}`
        }
    })
}

const makeDownloadRequest = async (url: string, accessToken: string): Promise<AxiosResponse<any, any>> => {
    return await axios.get(url, {
        responseType: 'stream',
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    })
}

const retryWithExponentialBackoff = async (
    fn: (url: string, accessToken: string) => Promise<AxiosResponse<any, any>>,
    url: string,
    accessToken: string
): Promise<AxiosResponse<any, any>> => {
    let attempt = 1
    const execute = async (): Promise<AxiosResponse<any, any>> => {
        try {
            return await fn(url, accessToken)
        } catch (e: any) {
            if (e?.response?.status === 429) {
                if (attempt > 5) {
                    console.warn('Exceeded number of allowed attempts')
                    throw e
                }

                const delayMs = (parseInt(e?.response?.headers['retry-after']) + 1) * 1000 * attempt
                console.warn(`The request to url ${url} was throttled. Retry attempt ${attempt} will occur after ${delayMs}ms`)
                await new Promise((resolve) => setTimeout(resolve, delayMs))

                attempt++
                return execute()
            }

            throw e
        }
    }

    return execute()
}

const downloadFile = async (baseUrl: string, downloadToPath: string, fileRelativeUrl: string, accessToken: string): Promise<void> => {
    try {
        const getFileUrl = `${baseUrl}/_api/web/GetFileByServerRelativeUrl('${fileRelativeUrl}')/$value`

        const finishedDownload = promisify(stream.finished)
        const writer = fsDefault.createWriteStream(downloadToPath)
        const response = await retryWithExponentialBackoff(makeDownloadRequest, getFileUrl, accessToken)

        response.data.pipe(writer)
        await finishedDownload(writer)
    } catch (e: any) {
        // keep going if a file cant be downloaded, in the event we encounter a filename we cannot download (ex files beginning with names like '#4-')
        console.warn(`Failed to download file ${fileRelativeUrl} from sharepoint folder: ${e.message}`)
    }
}

module.exports = { nodeClass: Sharepoint_DocumentLoaders }
