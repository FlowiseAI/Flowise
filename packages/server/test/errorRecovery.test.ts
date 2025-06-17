import supertest from 'supertest'
import { StatusCodes } from 'http-status-codes'
import { getRunningExpressApp } from '../src/utils/getRunningExpressApp'

export function errorRecoveryTest() {
    describe('Error Recovery', () => {
        it('should convert html errors to json', async () => {
            await supertest(getRunningExpressApp().app)
                .get('/api/v1/test-error')
                .expect(StatusCodes.INTERNAL_SERVER_ERROR)
                .expect('Content-Type', /application\/json/)
        })
    })
}
