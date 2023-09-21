import { INodeParams, INodeCredential } from '../src/Interface'

class LLMonitorApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'LLMonitor API'
        this.name = 'llmonitorApi'
        this.version = 1.0
        this.description = 'Refer to <a target="_blank" href="https://llmonitor.com/docs">official guide</a> to get APP ID'
        this.inputs = [
            {
                label: 'APP ID',
                name: 'llmonitorAppId',
                type: 'password',
                placeholder: '<LLMonitor_APP_ID>'
            },
            {
                label: 'Endpoint',
                name: 'llmonitorEndpoint',
                type: 'string',
                default: 'https://app.llmonitor.com'
            }
        ]
    }
}

module.exports = { credClass: LLMonitorApi }
