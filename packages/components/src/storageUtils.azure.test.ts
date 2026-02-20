// Test Azure Blob Storage configuration functions
// We mock the heavy dependencies to avoid ESM/CJS issues in test environment
jest.mock('@aws-sdk/client-s3', () => ({
    DeleteObjectsCommand: jest.fn(),
    GetObjectCommand: jest.fn(),
    ListObjectsCommand: jest.fn(),
    ListObjectsV2Command: jest.fn(),
    PutObjectCommand: jest.fn(),
    S3Client: jest.fn()
}))
jest.mock('@google-cloud/storage', () => ({ Storage: jest.fn() }))
jest.mock('@azure/storage-blob', () => {
    const mockContainerClient = {
        getBlockBlobClient: jest.fn(),
        listBlobsFlat: jest.fn(),
        deleteBlob: jest.fn()
    }

    // Mock BlobServiceClient as both a constructor and with static methods
    function MockBlobServiceClient() {
        return {
            getContainerClient: jest.fn().mockReturnValue(mockContainerClient)
        }
    }
    MockBlobServiceClient.fromConnectionString = jest.fn().mockReturnValue({
        getContainerClient: jest.fn().mockReturnValue(mockContainerClient)
    })

    return {
        BlobServiceClient: MockBlobServiceClient,
        ContainerClient: jest.fn(),
        StorageSharedKeyCredential: jest.fn()
    }
})
jest.mock('sanitize-filename', () => (name: string) => name)
jest.mock('./utils', () => ({
    getUserHome: jest.fn().mockReturnValue('/tmp')
}))
jest.mock('./validator', () => ({
    isPathTraversal: jest.fn().mockReturnValue(false),
    isValidUUID: jest.fn().mockReturnValue(true)
}))

import { getStorageType, getAzureBlobConfig } from './storageUtils'

// Save original env
const originalEnv = { ...process.env }

describe('storageUtils - Azure Blob Storage', () => {
    afterEach(() => {
        process.env = { ...originalEnv }
    })

    describe('getStorageType', () => {
        it('should return "local" when STORAGE_TYPE is not set', () => {
            delete process.env.STORAGE_TYPE
            expect(getStorageType()).toBe('local')
        })

        it('should return "azure" when STORAGE_TYPE is set to azure', () => {
            process.env.STORAGE_TYPE = 'azure'
            expect(getStorageType()).toBe('azure')
        })

        it('should return "s3" when STORAGE_TYPE is set to s3', () => {
            process.env.STORAGE_TYPE = 's3'
            expect(getStorageType()).toBe('s3')
        })

        it('should return "gcs" when STORAGE_TYPE is set to gcs', () => {
            process.env.STORAGE_TYPE = 'gcs'
            expect(getStorageType()).toBe('gcs')
        })
    })

    describe('getAzureBlobConfig', () => {
        it('should throw when container name is not set', () => {
            process.env.AZURE_BLOB_STORAGE_CONNECTION_STRING = 'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=dGVzdA==;EndpointSuffix=core.windows.net'
            delete process.env.AZURE_BLOB_STORAGE_CONTAINER_NAME

            expect(() => getAzureBlobConfig()).toThrow('AZURE_BLOB_STORAGE_CONTAINER_NAME env variable is required')
        })

        it('should throw when no credentials are provided', () => {
            process.env.AZURE_BLOB_STORAGE_CONTAINER_NAME = 'test-container'
            delete process.env.AZURE_BLOB_STORAGE_CONNECTION_STRING
            delete process.env.AZURE_BLOB_STORAGE_ACCOUNT_NAME
            delete process.env.AZURE_BLOB_STORAGE_ACCESS_KEY

            expect(() => getAzureBlobConfig()).toThrow('Azure Blob Storage configuration is missing')
        })

        it('should create client with connection string', () => {
            process.env.AZURE_BLOB_STORAGE_CONTAINER_NAME = 'test-container'
            process.env.AZURE_BLOB_STORAGE_CONNECTION_STRING =
                'DefaultEndpointsProtocol=https;AccountName=testaccount;AccountKey=dGVzdGtleQ==;EndpointSuffix=core.windows.net'

            const config = getAzureBlobConfig()

            expect(config).toHaveProperty('blobServiceClient')
            expect(config).toHaveProperty('containerClient')
            expect(config.containerName).toBe('test-container')
        })

        it('should create client with account name and key', () => {
            process.env.AZURE_BLOB_STORAGE_CONTAINER_NAME = 'test-container'
            process.env.AZURE_BLOB_STORAGE_ACCOUNT_NAME = 'testaccount'
            process.env.AZURE_BLOB_STORAGE_ACCESS_KEY = 'dGVzdGtleQ=='
            delete process.env.AZURE_BLOB_STORAGE_CONNECTION_STRING

            const config = getAzureBlobConfig()

            expect(config).toHaveProperty('blobServiceClient')
            expect(config).toHaveProperty('containerClient')
            expect(config.containerName).toBe('test-container')
        })
    })
})
