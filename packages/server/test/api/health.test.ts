import axios from 'axios'
import { TEST_CONFIG } from '../setup'

describe('API Health Check', () => {
    it('should return 200 OK and "pong" for ping endpoint', async () => {
        try {
            const response = await axios.get(`${TEST_CONFIG.API_URL}/api/v1/ping`)
            expect(response.status).toBe(200)
            expect(response.data).toBe('pong')
        } catch (error) {
            expect(error).toBeNull() // This will fail the test with a proper message
        }
    })
})
