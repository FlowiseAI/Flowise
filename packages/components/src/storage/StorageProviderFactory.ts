import { IStorageProvider } from './IStorageProvider'
import { LocalStorageProvider } from './LocalStorageProvider'
import { S3StorageProvider } from './S3StorageProvider'
import { GCSStorageProvider } from './GCSStorageProvider'
import { AzureBlobStorageProvider } from './AzureBlobStorageProvider'

/**
 * Factory for creating and managing storage provider instances.
 * Uses singleton pattern to ensure only one provider instance exists.
 */
export class StorageProviderFactory {
    private static instance: IStorageProvider | null = null

    /**
     * Get the storage provider instance based on STORAGE_TYPE environment variable.
     * Creates a new instance if one doesn't exist.
     */
    static getProvider(): IStorageProvider {
        if (!StorageProviderFactory.instance) {
            const storageType = process.env.STORAGE_TYPE || 'local'

            switch (storageType) {
                case 's3':
                    StorageProviderFactory.instance = new S3StorageProvider()
                    break
                case 'gcs':
                    StorageProviderFactory.instance = new GCSStorageProvider()
                    break
                case 'azure':
                    StorageProviderFactory.instance = new AzureBlobStorageProvider()
                    break
                case 'local':
                default:
                    StorageProviderFactory.instance = new LocalStorageProvider()
                    break
            }
        }
        return StorageProviderFactory.instance
    }
}
