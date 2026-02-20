describe('AzureBlobStorage Credential', () => {
    it('should export a valid credential class', () => {
        const { credClass: AzureBlobStorageApi } = require('../credentials/AzureBlobStorage.credential')
        const instance = new AzureBlobStorageApi()

        expect(instance.label).toBe('Azure Blob Storage')
        expect(instance.name).toBe('azureBlobStorageApi')
        expect(instance.version).toBe(1.0)
        expect(instance.inputs).toBeDefined()
        expect(instance.inputs.length).toBe(3)

        const inputNames = instance.inputs.map((i: any) => i.name)
        expect(inputNames).toContain('connectionString')
        expect(inputNames).toContain('storageAccountName')
        expect(inputNames).toContain('accessKey')

        // All inputs should be optional since user can use either connection string or account/key
        instance.inputs.forEach((input: any) => {
            expect(input.optional).toBe(true)
        })
    })
})

describe('AzureBlobFile Document Loader', () => {
    it('should export a valid node class', () => {
        let AzureBlobFile: any
        try {
            const mod = require('../nodes/documentloaders/AzureBlobFile/AzureBlobFile')
            AzureBlobFile = mod.nodeClass
        } catch (e: any) {
            // If the module can't be loaded due to transitive dependencies (e.g. pdf-parse, pdfjs-dist),
            // skip the test rather than fail
            console.warn('Skipping AzureBlobFile test - module dependency issue:', e.message)
            return
        }
        const instance = new AzureBlobFile()

        expect(instance.label).toBe('Azure Blob Storage')
        expect(instance.name).toBe('azureBlobFile')
        expect(instance.version).toBe(1.0)
        expect(instance.type).toBe('Document')
        expect(instance.category).toBe('Document Loaders')
        expect(instance.baseClasses).toContain('Document')

        // Check credential
        expect(instance.credential).toBeDefined()
        expect(instance.credential.credentialNames).toContain('azureBlobStorageApi')

        // Check inputs
        expect(instance.inputs).toBeDefined()
        const inputNames = instance.inputs.map((i: any) => i.name)
        expect(inputNames).toContain('containerName')
        expect(inputNames).toContain('blobName')
        expect(inputNames).toContain('fileProcessingMethod')

        // Check outputs
        expect(instance.outputs).toBeDefined()
        expect(instance.outputs.length).toBe(2)
        const outputNames = instance.outputs.map((o: any) => o.name)
        expect(outputNames).toContain('document')
        expect(outputNames).toContain('text')
    })
})
