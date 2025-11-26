import { generateAPIKey } from '../../src/utils/apiKey'

export function apiKeyTest() {
    describe('Api Key', () => {
        it('should be able to generate a new api key', () => {
            const apiKey = generateAPIKey()
            expect(typeof apiKey === 'string').toEqual(true)
        })
    })
}
