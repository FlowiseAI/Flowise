import { Document } from '@langchain/core/documents'
import { index } from './indexing'

const createRecordManager = () => ({
    getTime: jest.fn().mockResolvedValue(100),
    exists: jest.fn().mockResolvedValue([false]),
    update: jest.fn().mockResolvedValue(undefined),
    listKeys: jest.fn().mockResolvedValue(['stored-key']),
    deleteKeys: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined)
})

const createDocs = () => [
    new Document({
        pageContent: 'hello',
        metadata: {
            docId: 'doc-1',
            source: 'source-1'
        }
    })
]

describe('index record manager lifecycle', () => {
    it('closes record managers that expose a close method after successful indexing', async () => {
        const recordManager = createRecordManager()
        const vectorStore = {
            addDocuments: jest.fn().mockResolvedValue(undefined),
            delete: jest.fn().mockResolvedValue(undefined)
        }

        await expect(
            index({
                docsSource: createDocs(),
                recordManager: recordManager as any,
                vectorStore: vectorStore as any,
                options: {
                    sourceIdKey: 'source'
                }
            })
        ).resolves.toEqual({
            numAdded: 1,
            numDeleted: 0,
            numUpdated: 0,
            numSkipped: 0,
            totalKeys: 1,
            addedDocs: [
                {
                    pageContent: 'hello',
                    metadata: {
                        docId: 'doc-1',
                        source: 'source-1'
                    }
                }
            ]
        })

        expect(recordManager.close).toHaveBeenCalledTimes(1)
    })

    it('closes record managers that expose a close method when indexing fails', async () => {
        const recordManager = createRecordManager()
        const vectorStore = {
            addDocuments: jest.fn().mockRejectedValue(new Error('add failed')),
            delete: jest.fn().mockResolvedValue(undefined)
        }

        await expect(
            index({
                docsSource: createDocs(),
                recordManager: recordManager as any,
                vectorStore: vectorStore as any,
                options: {
                    sourceIdKey: 'source'
                }
            })
        ).rejects.toThrow('add failed')

        expect(recordManager.close).toHaveBeenCalledTimes(1)
    })
})
