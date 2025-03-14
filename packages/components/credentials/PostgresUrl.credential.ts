import { INodeParams, INodeCredential } from '../src/Interface'

class PostgresUrl implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Postgres URL'
        this.name = 'PostgresUrl'
        this.version = 1.0
        this.inputs = [
            {
                label: 'Postgres URL',
                name: 'postgresUrl',
                type: 'string',
                placeholder: 'postgresql://localhost/mydb'
            }
        ]
    }
}

module.exports = { credClass: PostgresUrl }
