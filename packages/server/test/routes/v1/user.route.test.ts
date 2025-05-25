import { StatusCodes } from 'http-status-codes'
import supertest from 'supertest'
import { getRunningExpressApp } from '../../../src/utils/getRunningExpressApp'

export function userRouteTest() {
    describe('User Route', () => {
        const route = '/api/v1/user'

        describe(`GET ${route}/test successful without user status`, () => {
            const statusCode = StatusCodes.OK
            const message = 'Hello World'

            it(`should return a ${statusCode} status and message of ${message}`, async () => {
                await supertest(getRunningExpressApp().app)
                    .get(`${route + '/test'}`)
                    .expect(statusCode)
                    .then((response) => {
                        const body = response.body
                        expect(body.message).toEqual(message)
                    })
            })
        })

        describe(`POST ${route}/test successful without user status`, () => {
            const statusCode = StatusCodes.OK
            const message = 'Hello World'

            it(`should return a ${statusCode} status and message of ${message}`, async () => {
                await supertest(getRunningExpressApp().app)
                    .get(`${route + '/test'}`)
                    .expect(statusCode)
                    .then((response) => {
                        const body = response.body
                        expect(body.message).toEqual(message)
                    })
            })
        })

        describe(`PUT ${route}/test successful without user status`, () => {
            const statusCode = StatusCodes.OK
            const message = 'Hello World'

            it(`should return a ${statusCode} status and message of ${message}`, async () => {
                await supertest(getRunningExpressApp().app)
                    .get(`${route + '/test'}`)
                    .expect(statusCode)
                    .then((response) => {
                        const body = response.body
                        expect(body.message).toEqual(message)
                    })
            })
        })
    })
}
