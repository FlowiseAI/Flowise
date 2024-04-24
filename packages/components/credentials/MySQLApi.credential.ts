import { INodeParams, INodeCredential } from '../src/Interface'

class MySQLApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'MySQL API'
        this.name = 'MySQLApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'User',
                name: 'user',
                type: 'string',
                placeholder: '<MYSQL_USERNAME>'
            },
            {
                label: 'Password',
                name: 'password',
                type: 'password',
                placeholder: '<MYSQL_PASSWORD>'
            }
        ]
    }
}

module.exports = { credClass: MySQLApi }
