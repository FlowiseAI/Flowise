import { INodeParams, INodeCredential } from '../src/Interface'

class BaiduApi implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'Baidu API'
        this.name = 'baiduApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'Baidu Api Key',
                name: 'baiduApiKey',
                type: 'password'
            },
            {
                label: 'Baidu Secret Key',
                name: 'baiduSecretKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: BaiduApi }
