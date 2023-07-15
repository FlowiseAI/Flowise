import { INodeParams, INodeCredential } from '../src/Interface'

class SupabaseApi implements INodeCredential {
    label: string
    name: string
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Supabase API'
        this.name = 'supabaseApi'
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
