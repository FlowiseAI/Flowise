import { INodeParams, INodeCredential } from '../src/Interface'

class UpstashVectorApi implements INodeCredential {
	label: string
	name: string
	version: number
	description: string
	inputs: INodeParams[]

	constructor() {
		this.label = 'Upstash Vector API'
		this.name = 'upstashVectorApi'
		this.version = 1.0
		this.inputs = [
			{
				label: 'UPSTASH_VECTOR_REST_URL',
				name: 'UPSTASH_VECTOR_REST_URL',
				type: 'string'
			},
			{
				label: 'UPSTASH_VECTOR_REST_TOKEN',
				name: 'UPSTASH_VECTOR_REST_TOKEN',
				type: 'password'
			}
		]
	}
}

module.exports = { credClass: UpstashVectorApi }
