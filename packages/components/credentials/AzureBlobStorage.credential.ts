import { INodeParams, INodeCredential } from '../src/Interface'

class AzureBlobStorageApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Azure Blob Storage'
        this.name = 'azureBlobStorageApi'
        this.version = 1.0
        this.description =
            'Your <a target="_blank" href="https://learn.microsoft.com/en-us/azure/storage/common/storage-account-keys-manage">Azure Blob Storage credentials</a>. You can use either a connection string or an account name with an access key.'
        this.inputs = [
            {
                label: 'Connection String',
                name: 'connectionString',
                type: 'password',
                description: 'Azure Storage connection string. If provided, account name and access key are ignored.',
                placeholder: 'DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...;EndpointSuffix=core.windows.net',
                optional: true
            },
            {
                label: 'Storage Account Name',
                name: 'storageAccountName',
                type: 'string',
                description: 'Azure Storage account name. Used together with Access Key when Connection String is not provided.',
                placeholder: 'mystorageaccount',
                optional: true
            },
            {
                label: 'Access Key',
                name: 'accessKey',
                type: 'password',
                description: 'Azure Storage account access key. Used together with Storage Account Name.',
                optional: true
            }
        ]
    }
}

module.exports = { credClass: AzureBlobStorageApi }
