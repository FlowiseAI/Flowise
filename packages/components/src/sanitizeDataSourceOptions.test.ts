import { mergeDataSourceOptions, rejectReservedDataSourceKeys, sanitizeDataSourceOptions } from './sanitizeDataSourceOptions'

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

        it.each(['entities', 'subscribers', 'migrations', 'extra'] as const)('throws when %s is inherited via prototype chain', (key) => {
            const proto = { [key]: ['/tmp/evil.js'] }
            const config = Object.create(proto)
            expect(() => sanitizeDataSourceOptions(config)).toThrow(`Disallowed TypeORM DataSource option: ${key}`)
        })
    })

    describe('reserved connection keys', () => {
        it.each(['database', 'type', 'url', 'host', 'port', 'username', 'password'] as const)(
            'rejectReservedDataSourceKeys throws when %s is present',
            (key) => {
                expect(() => rejectReservedDataSourceKeys({ [key]: 'evil' })).toThrow(`Disallowed TypeORM DataSource option: ${key}`)
            }
        )
    })
})

describe('mergeDataSourceOptions', () => {
    it('applies protected options after safe user options', () => {
        const result = mergeDataSourceOptions({ database: '/safe/db.sqlite', type: 'sqlite' }, { connectTimeout: 10000 })
        expect(result).toEqual({
            connectTimeout: 10000,
            database: '/safe/db.sqlite',
            type: 'sqlite'
        })
    })

    it('throws when user options include reserved database key', () => {
        expect(() =>
            mergeDataSourceOptions({ database: '/safe/db.sqlite', type: 'sqlite' }, { database: '/etc/chromium/exploit.conf' })
        ).toThrow('Disallowed TypeORM DataSource option: database')
    })

    it('passes through safe user options', () => {
        const result = mergeDataSourceOptions({ type: 'sqlite', database: '/safe/db.sqlite' }, { poolSize: 5 })
        expect(result).toEqual({ poolSize: 5, type: 'sqlite', database: '/safe/db.sqlite' })
    })
})
