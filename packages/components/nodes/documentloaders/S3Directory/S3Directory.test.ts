jest.mock('@aws-sdk/client-s3', () => ({
    S3Client: jest.fn(),
    GetObjectCommand: jest.fn(),
    ListObjectsV2Command: jest.fn().mockImplementation((input) => ({ input }))
}))

describe('S3Directory', () => {
    const s3Client = { send: jest.fn() }
    let getS3FileKeys: (s3Client: any, bucketName: string, prefix: string) => Promise<string[]>
    let ListObjectsV2Command: jest.Mock

    beforeEach(async () => {
        jest.clearAllMocks()
        s3Client.send.mockReset()

        const s3Module = require('@aws-sdk/client-s3')
        ListObjectsV2Command = s3Module.ListObjectsV2Command

        const module = (await import('./S3Directory')) as any
        getS3FileKeys = module.getS3FileKeys
    })

    it('loads keys from every S3 list page', async () => {
        s3Client.send
            .mockResolvedValueOnce({
                Contents: [{ Key: 'docs/0001.txt', ETag: 'etag-1' }],
                IsTruncated: true,
                NextContinuationToken: 'next-page'
            })
            .mockResolvedValueOnce({
                Contents: [{ Key: 'docs/1001.txt', ETag: 'etag-2' }],
                IsTruncated: false
            })

        await expect(getS3FileKeys(s3Client, 'documents', 'docs/')).resolves.toEqual(['docs/0001.txt', 'docs/1001.txt'])
        expect(ListObjectsV2Command).toHaveBeenNthCalledWith(1, {
            Bucket: 'documents',
            Prefix: 'docs/',
            ContinuationToken: undefined
        })
        expect(ListObjectsV2Command).toHaveBeenNthCalledWith(2, {
            Bucket: 'documents',
            Prefix: 'docs/',
            ContinuationToken: 'next-page'
        })
    })
})
