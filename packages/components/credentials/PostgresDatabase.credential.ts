import { INodeParams, INodeCredential } from '../src/Interface'

class PostgresDatabase implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Postgres Database'
        this.name = 'postgresDatabase'
        this.version = 1.0
        this.inputs = [
            {
                label: 'User',
                name: 'user',
                type: 'string',
                placeholder: '<POSTGRES_USER>'
            },
            {
                label: 'Password',
                name: 'password',
                type: 'password',
                placeholder: '<POSTGRES_PASSWORD>'
            },
            {
                label: 'Host',
                name: 'host',
                type: 'string',
                placeholder: '<POSTGRES_HOST>'
            },
            {
                label: 'Port',
                name: 'port',
                type: 'string',
                placeholder: '<POSTGRES_PORT>'
            },

        ]
    }
}

module.exports = { credClass: PostgresDatabase }
