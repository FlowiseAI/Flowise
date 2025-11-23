import { INodeCredential, INodeParams } from "../src/Interface"

class GigaChatApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'GigaChat API'
        this.name = 'gigaChatApi'
        this.version = 1.0
        this.description = 'You can get the Credentials token from GigaChat API in Developer Console'
        this.inputs = [
            {
                label: 'Access Token',
                name: 'accessToken',
                type: 'password',
                placeholder: '<GIGACHAT_CREDENTIALS>'
            }
        ]
    }
}

module.exports = { credClass: GigaChatApi }