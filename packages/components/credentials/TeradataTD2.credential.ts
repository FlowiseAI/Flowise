import { INodeParams, INodeCredential } from '../src/Interface'

class TeradataTD2Credential implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'Teradata TD2 Auth'
        this.name = 'teradataTD2Auth'
        this.version = 1.0
        this.inputs = [
            {
                label: 'Teradata TD2 Auth Username',
                name: 'tdUsername',
                type: 'string'
            },
            {
                label: 'Teradata TD2 Auth Password',
                name: 'tdPassword',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: TeradataTD2Credential }
