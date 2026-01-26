import axios, { AxiosInstance } from 'axios'

export class AgentflowAPI {
    private client: AxiosInstance
    private token: string

    constructor(instanceUrl: string, token: string) {
        this.token = token
        this.client = axios.create({
            baseURL: instanceUrl,
            headers: {
                'Content-Type': 'application/json',
                'X-Session-Token': token
            }
        })
    }

    /**
     * Fetch available components/nodes from the Flowise instance
     */
    async getComponents(names?: string[]) {
        try {
            const response = await this.client.get('/api/v1/nodes')
            let components = response.data

            // Filter by names if provided
            if (names && names.length > 0) {
                components = components.filter((comp: any) => names.includes(comp.name))
            }

            return components
        } catch (error) {
            console.error('Failed to fetch components:', error)
            throw error
        }
    }

    /**
     * Fetch credentials for components
     */
    async getCredentials() {
        try {
            const response = await this.client.get('/api/v1/credentials')
            return response.data
        } catch (error) {
            console.error('Failed to fetch credentials:', error)
            return []
        }
    }

    /**
     * Fetch variables
     */
    async getVariables() {
        try {
            const response = await this.client.get('/api/v1/variables')
            return response.data
        } catch (error) {
            console.error('Failed to fetch variables:', error)
            return []
        }
    }

    /**
     * Save chatflow (for persistence)
     */
    async saveChatflow(chatflow: any) {
        try {
            const response = await this.client.post('/api/v1/chatflows', chatflow)
            return response.data
        } catch (error) {
            console.error('Failed to save chatflow:', error)
            throw error
        }
    }

    /**
     * Update chatflow
     */
    async updateChatflow(id: string, chatflow: any) {
        try {
            const response = await this.client.put(`/api/v1/chatflows/${id}`, chatflow)
            return response.data
        } catch (error) {
            console.error('Failed to update chatflow:', error)
            throw error
        }
    }
}
