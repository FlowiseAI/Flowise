import { sanitizeDataSourceOptions } from './sanitizeDataSourceOptions'

describe('sanitizeDataSourceOptions', () => {
    it('returns empty object for empty input', () => {
        expect(sanitizeDataSourceOptions({})).toEqual({})
    })

    it('returns empty object for nullish-like invalid input', () => {
        expect(sanitizeDataSourceOptions(null as any)).toEqual({})
        expect(sanitizeDataSourceOptions(undefined as any)).toEqual({})
    })

    it('passes through safe connection options', () => {
        const config = {
            ssl: { rejectUnauthorized: false },
            connectTimeout: 10000,
            poolSize: 5
        }
        expect(sanitizeDataSourceOptions(config)).toEqual(config)
    })

    it('returns a shallow copy and does not mutate the input', () => {
        const config = { poolSize: 5 }
        const result = sanitizeDataSourceOptions(config)
        expect(result).toEqual(config)
        expect(result).not.toBe(config)
    })

    describe('blocked keys', () => {
        it.each(['entities', 'subscribers', 'migrations', 'extra'] as const)('throws when %s is present', (key) => {
            expect(() => sanitizeDataSourceOptions({ [key]: ['/tmp/evil.js'] })).toThrow(`Disallowed TypeORM DataSource option: ${key}`)
        })

        it('throws when multiple blocked keys are present', () => {
            expect(() =>
                sanitizeDataSourceOptions({
                    entities: ['/tmp/a.js'],
                    extra: { foo: 'bar' }
                })
            ).toThrow('Disallowed TypeORM DataSource option:')
        })
    })
})
