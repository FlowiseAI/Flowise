import { getBaseClasses, getCredentialData, getCredentialParam } from '../../src'
import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams } from '../../src/Interface'
import { IApiClientCredentials, KCenterApiClient } from './KCenterApiClient'

export interface IKCenterConnector {}

class KCenterConnector implements INode, IKCenterConnector {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    outputs: INodeOutputsValue[]
    credential: INodeParams

    constructor() {
        this.label = 'KCenter API Connector'
        this.name = 'kcenterConnector'
        this.version = 1.0
        this.type = 'KCenterConnector'
        this.icon = 'logo.svg'
        this.category = 'KCenter'
        this.description = `KCenter API Connector`
        this.baseClasses = [this.type, ...getBaseClasses(KCenterApiClient)]

        this.credential = {
            label: 'KCenter Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['kcenterApi']
        }

        this.inputs = []
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)

        const clientCredentialData = <IApiClientCredentials>{
            userid: getCredentialParam('user', credentialData, nodeData),
            mandator: getCredentialParam('mandator', credentialData, nodeData),
            baseUrl: getCredentialParam('baseUrl', credentialData, nodeData),
            providerId: getCredentialParam('providerId', credentialData, nodeData),
            privateKey: getCredentialParam('accessToken', credentialData, nodeData)
        }

        return new KCenterApiClient(clientCredentialData)
    }
}

module.exports = { nodeClass: KCenterConnector }
