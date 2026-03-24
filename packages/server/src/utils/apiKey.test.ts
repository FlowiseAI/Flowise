import { generateAPIKey } from './apiKey'

describe('Api Key', () => {
    it('should be able to generate a new api key', () => {
        const apiKey = generateAPIKey()
        expect(typeof apiKey === 'string').toEqual(true)
    })
})
