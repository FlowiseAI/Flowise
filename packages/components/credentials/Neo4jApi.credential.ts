import { INodeParams, INodeCredential } from '../src/Interface'

class Neo4jApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Neo4j API'
        this.name = 'neo4jApi'
        this.version = 1.0
        this.description =
            'Refer to <a target="_blank" href="https://neo4j.com/docs/operations-manual/current/authentication-authorization/">official guide</a> on Neo4j authentication'
        this.inputs = [
            {
                label: 'Neo4j URL',
                name: 'url',
                type: 'string',
                description: 'Your Neo4j instance URL (e.g., neo4j://localhost:7687)'
            },
            {
                label: 'Username',
                name: 'username',
                type: 'string',
                description: 'Neo4j database username'
            },
            {
                label: 'Password',
                name: 'password',
                type: 'password',
                description: 'Neo4j database password'
            }
        ]
    }
}

module.exports = { credClass: Neo4jApi }
