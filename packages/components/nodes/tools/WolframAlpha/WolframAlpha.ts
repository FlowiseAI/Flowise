import { WolframAlphaTool } from '@langchain/community/tools/wolframalpha'
import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'

class WolframAlpha_Tools implements INode {
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
        this.label = 'WolframAlpha'
        this.name = 'wolframAlpha'
        this.version = 1.0
        this.type = 'WolframAlpha'
        this.icon = 'wolframalpha.png'
        this.category = 'Tools'
        this.description = 'Wrapper around WolframAlpha - a powerful computational knowledge engine'
        this.inputs = []
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['wolframAlphaAppId']
        }
        this.baseClasses = [this.type, ...getBaseClasses(WolframAlphaTool)]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const wolframAlphaAppId = getCredentialParam('wolframAlphaAppId', credentialData, nodeData)
        return new WolframAlphaTool({
            appid: wolframAlphaAppId
        })
    }
}

module.exports = { nodeClass: WolframAlpha_Tools }
