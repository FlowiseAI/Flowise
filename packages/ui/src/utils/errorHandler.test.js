import { describe, expect, test } from 'vitest'
import { getErrorMessage } from './errorHandler'

describe('getErrorMessage', () => {
    test('returns empty message when arg is Error object with no message', () => {
        const returnedMessage = getErrorMessage(new Error())
        expect(returnedMessage).toEqual('')
    })

    test('returns expected message when arg is Error object with message', () => {
        const expectedMessage = 'TEST MESSAGE 123'
        const returnedMessage = getErrorMessage(new Error(expectedMessage))
        expect(returnedMessage).toEqual(expectedMessage)
    })

    test('returns expected message when arg is unknown object with message', () => {
        const object = { message: 'TEST MESSAGE 123' }
        const returnedMessage = getErrorMessage(object)
        expect(returnedMessage).toEqual(object.message)
    })

    test('returns string when arg is primitive', () => {
        const returnedMessage = getErrorMessage(1234)
        expect(returnedMessage).toEqual('1234')
    })

    test('returns stringified object when arg is unknown object', () => {
        const object = { property: 'value' }
        const expectedMessage = JSON.stringify(object)
        const returnedMessage = getErrorMessage(object)
        expect(returnedMessage).toEqual(expectedMessage)
    })
})
