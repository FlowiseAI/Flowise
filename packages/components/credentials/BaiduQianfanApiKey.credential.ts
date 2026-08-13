import { INodeParams, INodeCredential } from '../src/Interface'

class BaiduQianfanApiKey implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'Baidu Qianfan API Key'
        this.name = 'baiduQianfanApiKey'
        this.version = 1.0
        this.inputs = [
            {
                label: 'Qianfan API Key',
                name: 'qianfanApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: BaiduQianfanApiKey }
