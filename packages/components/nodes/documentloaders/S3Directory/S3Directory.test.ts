const { isS3FileKey } = require('./S3Directory')

describe('S3Directory', () => {
    describe('isS3FileKey', () => {
        it('skips S3 directory marker keys', () => {
            expect(isS3FileKey('docs/')).toBe(false)
            expect(isS3FileKey('docs/nested/')).toBe(false)
        })

        it('keeps regular file keys, including empty file keys with extensions', () => {
            expect(isS3FileKey('docs/readme.txt')).toBe(true)
            expect(isS3FileKey('empty-file.txt')).toBe(true)
        })

        it('skips missing keys', () => {
            expect(isS3FileKey()).toBe(false)
            expect(isS3FileKey('')).toBe(false)
        })
    })
})
