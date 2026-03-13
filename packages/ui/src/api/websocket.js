import client from '@/api/client'

const checkWebSocketHealth = () => client.get('/ws/health')

export default {
    checkWebSocketHealth
}
