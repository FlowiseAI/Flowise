import { Request } from 'express'
import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../errors/internalFlowiseError'
import { getPageAndLimitParams } from './pagination'

const makeRequest = (query: Request['query']): Request => ({ query }) as Request

describe('getPageAndLimitParams', () => {
    it('returns sentinel values when pagination is not provided', () => {
        expect(getPageAndLimitParams(makeRequest({}))).toEqual({ page: -1, limit: -1 })
    })

    it('parses non-negative integer pagination values', () => {
        expect(getPageAndLimitParams(makeRequest({ page: '2', limit: '25' }))).toEqual({ page: 2, limit: 25 })
    })

    it('allows zero so existing callers can apply their default pagination behavior', () => {
        expect(getPageAndLimitParams(makeRequest({ page: '0', limit: '0' }))).toEqual({ page: 0, limit: 0 })
    })

    it.each([
        ['page', '-1'],
        ['page', 'abc'],
        ['page', '1.5'],
        ['page', ['1', '2']],
        ['limit', '-1'],
        ['limit', 'abc'],
        ['limit', '1.5'],
        ['limit', ['1', '2']]
    ])('rejects invalid %s values', (paramName, value) => {
        expect(() => getPageAndLimitParams(makeRequest({ [paramName]: value }))).toThrow(InternalFlowiseError)

        try {
            getPageAndLimitParams(makeRequest({ [paramName]: value }))
        } catch (error) {
            expect((error as InternalFlowiseError).statusCode).toBe(StatusCodes.PRECONDITION_FAILED)
            expect((error as InternalFlowiseError).message).toContain(`${paramName} must be a non-negative integer`)
        }
    })
})
