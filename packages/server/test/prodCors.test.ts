import supertest from 'supertest'
import { getRunningExpressApp } from '../src/utils/getRunningExpressApp'

export function prodCorsTest() {
    describe('CORS Preflight', () => {
        it('should return 204 for OPTIONS with headers', async () => {
            await supertest(getRunningExpressApp().app)
                .options('/api/v1/ping')
                .set('Origin', 'http://localhost:3000')
                .expect(204)
                .expect('Access-Control-Allow-Origin', 'http://localhost:3000')
        })
    })
}
