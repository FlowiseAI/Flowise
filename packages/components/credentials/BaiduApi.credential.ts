import { INodeParams, INodeCredential } from '../src/Interface'

class BaiduQianfanApi implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'Baidu Qianfan API'
        this.name = 'baiduQianfanApi'
        this.version = 2.0
        this.inputs = [
            {
                label: 'Qianfan Access Key',
                name: 'qianfanAccessKey',
                type: 'string'
            },
            {
                label: 'Qianfan Secret Key',
                name: 'qianfanSecretKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: BaiduQianfanApi }
