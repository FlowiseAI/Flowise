import { INodeParams, INodeCredential } from '../src/Interface'

class SupabaseApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Supabase API'
        this.name = 'supabaseApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'Supabase API Key',
                name: 'supabaseApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: SupabaseApi }
