import { GCSStorageProvider } from './GCSStorageProvider'

const bucketMock = {}
const multerMock = jest.fn((config) => config)
const storageCtorMock = jest.fn(() => ({
    bucket: jest.fn(() => bucketMock)
}))
const multerGoogleCloudStorageMock = jest.fn((config) => config)

jest.mock('@google-cloud/storage', () => ({
    Storage: storageCtorMock
}))

jest.mock('multer', () => multerMock)

jest.mock('multer-cloud-storage', () => multerGoogleCloudStorageMock)

jest.mock('@google-cloud/logging-winston', () => ({
    LoggingWinston: jest.fn()
}))

describe('GCSStorageProvider', () => {
    const originalEnv = process.env

    beforeEach(() => {
        jest.clearAllMocks()
        process.env = {
            ...originalEnv,
            GOOGLE_CLOUD_STORAGE_BUCKET_NAME: 'test-bucket',
            GOOGLE_CLOUD_STORAGE_PROJ_ID: 'test-project',
            GOOGLE_CLOUD_STORAGE_CREDENTIAL: '/tmp/gcs.json'
        }
    })

    afterAll(() => {
        process.env = originalEnv
    })

    it('treats whitespace-padded false as disabled uniform bucket access', () => {
        process.env.GOOGLE_CLOUD_UNIFORM_BUCKET_ACCESS = ' false '

        const provider = new GCSStorageProvider()

        provider.getMulterStorage()

        expect(multerGoogleCloudStorageMock).toHaveBeenCalledWith(
            expect.objectContaining({
                uniformBucketLevelAccess: false
            })
        )
    })

    it('keeps uniform bucket access enabled when env is unset', () => {
        delete process.env.GOOGLE_CLOUD_UNIFORM_BUCKET_ACCESS

        const provider = new GCSStorageProvider()

        provider.getMulterStorage()

        expect(multerGoogleCloudStorageMock).toHaveBeenCalledWith(
            expect.objectContaining({
                uniformBucketLevelAccess: true
            })
        )
    })
})
