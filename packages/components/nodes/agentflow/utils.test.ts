import { revertBase64ImagesToFileRefs, processMessagesWithImages, addImageArtifactsToMessages, getUniqueImageMessages } from './utils'
import { sanitizeFileName } from '../../src/validator'

// Mock storageUtils
jest.mock('../../src/storageUtils', () => ({
    getFileFromStorage: jest.fn().mockResolvedValue(Buffer.from('fake-image-data')),
    addSingleFileToStorage: jest.fn().mockResolvedValue({ path: 'mock/path', totalSize: 100 })
}))

// Mock multiModalUtils
jest.mock('../../src/multiModalUtils', () => ({
    getImageUploads: jest.fn((uploads) => uploads.filter((u: any) => u.mime?.startsWith('image/')))
}))

// Mock node-fetch
jest.mock('node-fetch', () => jest.fn())

// Mock ../../src/utils to avoid pulling in axios (ESM)
jest.mock('../../src/utils', () => {
    return {
        getCredentialData: jest.fn(),
        getCredentialParam: jest.fn(),
        handleEscapeCharacters: jest.fn((str: string) => str),
        mapMimeTypeToInputField: jest.fn()
    }
})

describe('revertBase64ImagesToFileRefs', () => {
    it('reverts tagged image_url items to stored-file format', () => {
        const messages: any[] = [
            {
                role: 'user',
                content: [
                    {
                        type: 'image_url',
                        image_url: { url: 'data:image/jpeg;base64,abc123' },
                        _fileName: 'photo.jpg',
                        _mime: 'image/jpeg'
                    }
                ]
            },
            { role: 'user', content: 'what is this' }
        ]

        const result: any[] = revertBase64ImagesToFileRefs(messages) as any[]

        expect(result[0]).toEqual({
            role: 'user',
            content: [{ type: 'stored-file', name: 'photo.jpg', mime: 'image/jpeg' }]
        })
        expect(result[1]).toEqual({ role: 'user', content: 'what is this' })
    })

    it('leaves untagged image_url items (external URLs) untouched', () => {
        const messages: any[] = [
            {
                role: 'user',
                content: [
                    {
                        type: 'image_url',
                        image_url: { url: 'https://example.com/image.png' }
                    }
                ]
            }
        ]

        const result: any[] = revertBase64ImagesToFileRefs(messages) as any[]

        expect(result[0].content[0]).toEqual({
            type: 'image_url',
            image_url: { url: 'https://example.com/image.png' }
        })
    })

    it('handles mixed tagged and untagged items in the same message', () => {
        const messages: any[] = [
            {
                role: 'user',
                content: [
                    {
                        type: 'image_url',
                        image_url: { url: 'data:image/png;base64,xyz' },
                        _fileName: 'screenshot.png',
                        _mime: 'image/png'
                    },
                    {
                        type: 'image_url',
                        image_url: { url: 'https://example.com/photo.jpg' }
                    }
                ]
            }
        ]

        const result: any[] = revertBase64ImagesToFileRefs(messages) as any[]

        expect(result[0].content[0]).toEqual({ type: 'stored-file', name: 'screenshot.png', mime: 'image/png' })
        expect(result[0].content[1]).toEqual({ type: 'image_url', image_url: { url: 'https://example.com/photo.jpg' } })
    })

    it('handles multiple messages with multiple images each', () => {
        const messages: any[] = [
            {
                role: 'user',
                content: [
                    { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,a' }, _fileName: 'img1.jpg', _mime: 'image/jpeg' },
                    { type: 'image_url', image_url: { url: 'data:image/png;base64,b' }, _fileName: 'img2.png', _mime: 'image/png' }
                ]
            },
            {
                role: 'user',
                content: [{ type: 'image_url', image_url: { url: 'data:image/gif;base64,c' }, _fileName: 'img3.gif', _mime: 'image/gif' }]
            }
        ]

        const result: any[] = revertBase64ImagesToFileRefs(messages) as any[]

        expect(result[0].content[0]).toEqual({ type: 'stored-file', name: 'img1.jpg', mime: 'image/jpeg' })
        expect(result[0].content[1]).toEqual({ type: 'stored-file', name: 'img2.png', mime: 'image/png' })
        expect(result[1].content[0]).toEqual({ type: 'stored-file', name: 'img3.gif', mime: 'image/gif' })
    })

    it('does not mutate the original messages', () => {
        const original: any[] = [
            {
                role: 'user',
                content: [
                    { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,abc' }, _fileName: 'test.jpg', _mime: 'image/jpeg' }
                ]
            }
        ]

        const originalJson = JSON.stringify(original)
        revertBase64ImagesToFileRefs(original)

        expect(JSON.stringify(original)).toBe(originalJson)
    })

    it('handles messages with string content (no array)', () => {
        const messages: any[] = [
            { role: 'user', content: 'hello world' },
            { role: 'assistant', content: 'hi there' }
        ]

        const result: any[] = revertBase64ImagesToFileRefs(messages) as any[]

        expect(result).toEqual(messages)
    })

    it('handles empty messages array', () => {
        const result = revertBase64ImagesToFileRefs([])
        expect(result).toEqual([])
    })

    it('skips non-image_url array content items', () => {
        const messages: any[] = [
            {
                role: 'user',
                content: [
                    { type: 'text', text: 'describe this' },
                    { type: 'image_url', image_url: { url: 'data:image/png;base64,x' }, _fileName: 'pic.png', _mime: 'image/png' }
                ]
            }
        ]

        const result: any[] = revertBase64ImagesToFileRefs(messages) as any[]

        expect(result[0].content[0]).toEqual({ type: 'text', text: 'describe this' })
        expect(result[0].content[1]).toEqual({ type: 'stored-file', name: 'pic.png', mime: 'image/png' })
    })
})

describe('processMessagesWithImages', () => {
    const options = { chatflowid: 'flow1', chatId: 'chat1', orgId: 'org1' }

    it('converts stored-file refs to base64 with _fileName/_mime tags', async () => {
        const messages: any[] = [{ role: 'user', content: [{ type: 'stored-file', name: 'photo.jpg', mime: 'image/jpeg' }] }]

        const { updatedMessages } = await processMessagesWithImages(messages, options)
        const content = (updatedMessages[0] as any).content[0]

        expect(content.type).toBe('image_url')
        expect(content.image_url.url).toMatch(/^data:image\/jpeg;base64,/)
        expect(content._fileName).toBe('photo.jpg')
        expect(content._mime).toBe('image/jpeg')
    })

    it('returns original messages when chatflowid or chatId is missing', async () => {
        const messages: any[] = [{ role: 'user', content: [{ type: 'stored-file', name: 'a.png', mime: 'image/png' }] }]

        const { updatedMessages, transformedMessages } = await processMessagesWithImages(messages, { chatflowid: '', chatId: '' })

        expect(updatedMessages).toBe(messages)
        expect(transformedMessages).toEqual([])
    })

    it('skips non-user messages', async () => {
        const messages: any[] = [{ role: 'assistant', content: [{ type: 'stored-file', name: 'a.png', mime: 'image/png' }] }]

        const { updatedMessages } = await processMessagesWithImages(messages, options)

        expect((updatedMessages[0] as any).content[0].type).toBe('stored-file')
    })

    it('tracks transformed messages for revert', async () => {
        const messages: any[] = [{ role: 'user', content: [{ type: 'stored-file', name: 'img.png', mime: 'image/png' }] }]

        const { transformedMessages } = await processMessagesWithImages(messages, options)

        expect(transformedMessages).toHaveLength(1)
        expect(transformedMessages[0]).toEqual({
            role: 'user',
            content: [{ type: 'stored-file', name: 'img.png', mime: 'image/png' }]
        })
    })

    it('does not mutate the original messages', async () => {
        const messages: any[] = [{ role: 'user', content: [{ type: 'stored-file', name: 'img.png', mime: 'image/png' }] }]

        await processMessagesWithImages(messages, options)

        expect(messages[0].content[0].type).toBe('stored-file')
    })
})

describe('addImageArtifactsToMessages', () => {
    const options = { chatflowid: 'flow1', chatId: 'chat1', orgId: 'org1' }

    it('inserts temporary base64 user message after assistant message with image artifacts', async () => {
        const messages: any[] = [
            {
                role: 'assistant',
                content: 'Here is the image',
                additional_kwargs: {
                    artifacts: [{ type: 'png', data: 'uploads/generated_image.png' }]
                }
            }
        ]

        await addImageArtifactsToMessages(messages, options)

        expect(messages).toHaveLength(2)
        expect(messages[1].role).toBe('user')
        expect(messages[1]._isTemporaryImageMessage).toBe(true)
        expect(messages[1].content[0].type).toBe('image_url')
        expect(messages[1].content[0]._fileName).toBe('generated_image.png')
        expect(messages[1].content[0]._mime).toBe('image/png')
    })

    it('does not insert duplicate if next message already has the image', async () => {
        const messages: any[] = [
            {
                role: 'assistant',
                content: 'Image generated',
                additional_kwargs: {
                    artifacts: [{ type: 'png', data: 'uploads/generated_image.png' }]
                }
            },
            {
                role: 'user',
                content: [{ type: 'stored-file', name: 'generated_image.png', mime: 'image/png' }]
            }
        ]

        await addImageArtifactsToMessages(messages, options)

        expect(messages).toHaveLength(2)
    })

    it('skips non-image artifacts', async () => {
        const messages: any[] = [
            {
                role: 'assistant',
                content: 'Here is a document',
                additional_kwargs: {
                    artifacts: [{ type: 'pdf', data: 'uploads/doc.pdf' }]
                }
            }
        ]

        await addImageArtifactsToMessages(messages, options)

        expect(messages).toHaveLength(1)
    })

    it('does not modify messages without artifacts', async () => {
        const messages: any[] = [
            { role: 'user', content: 'hello' },
            { role: 'assistant', content: 'hi' }
        ]

        await addImageArtifactsToMessages(messages, options)

        expect(messages).toHaveLength(2)
    })

    it('handles multiple assistant messages with image artifacts', async () => {
        const messages: any[] = [
            {
                role: 'assistant',
                content: 'First image',
                additional_kwargs: { artifacts: [{ type: 'png', data: 'uploads/img1.png' }] }
            },
            { role: 'user', content: 'now another' },
            {
                role: 'assistant',
                content: 'Second image',
                additional_kwargs: { artifacts: [{ type: 'jpg', data: 'uploads/img2.jpg' }] }
            }
        ]

        await addImageArtifactsToMessages(messages, options)

        // Should have 5 messages: assistant, temp_img, user, assistant, temp_img
        expect(messages).toHaveLength(5)
        expect(messages[1]._isTemporaryImageMessage).toBe(true)
        expect(messages[1].content[0]._fileName).toBe('img1.png')
        expect(messages[4]._isTemporaryImageMessage).toBe(true)
        expect(messages[4].content[0]._fileName).toBe('img2.jpg')
    })
})

describe('getUniqueImageMessages', () => {
    it('returns base64 message with _fileName/_mime tags', async () => {
        const options = {
            uploads: [{ type: 'stored-file', name: 'photo.jpg', mime: 'image/jpeg', data: '' }],
            chatflowid: 'flow1',
            chatId: 'chat1',
            orgId: 'org1'
        }
        const modelConfig = { allowImageUploads: true }

        const result = await getUniqueImageMessages(options, [], modelConfig)

        expect(result).toBeDefined()
        const content = (result!.imageMessageWithBase64 as any).content[0]
        expect(content.type).toBe('image_url')
        expect(content._fileName).toBe('photo.jpg')
        expect(content._mime).toBe('image/jpeg')
    })

    it('returns undefined when no uploads', async () => {
        const result = await getUniqueImageMessages({}, [], {})
        expect(result).toBeUndefined()
    })

    it('filters out images already in messages', async () => {
        const existingBase64 = 'data:image/jpeg;base64,' + Buffer.from('fake-image-data').toString('base64')
        const options = {
            uploads: [{ type: 'stored-file', name: 'photo.jpg', mime: 'image/jpeg', data: '' }],
            chatflowid: 'flow1',
            chatId: 'chat1',
            orgId: 'org1'
        }
        const messages: any[] = [
            {
                role: 'user',
                content: [
                    {
                        type: 'image_url',
                        image_url: { url: existingBase64, detail: 'low' },
                        _fileName: 'photo.jpg',
                        _mime: 'image/jpeg'
                    }
                ]
            }
        ]
        const modelConfig = { allowImageUploads: true }

        const result = await getUniqueImageMessages(options, messages, modelConfig)

        expect(result).toBeUndefined()
    })
})

describe('end-to-end: base64 tagging and revert', () => {
    it('upload image → base64 for invoke → revert to file refs for storage', async () => {
        const options = {
            uploads: [{ type: 'stored-file', name: 'cat.png', mime: 'image/png', data: '' }],
            chatflowid: 'flow1',
            chatId: 'chat1',
            orgId: 'org1'
        }
        const modelConfig = { allowImageUploads: true }

        // Step 1: Build messages with base64 (as the node does)
        const messages: any[] = []
        const imageContents = await getUniqueImageMessages(options, messages, modelConfig)
        if (imageContents) {
            messages.push(imageContents.imageMessageWithBase64)
        }
        messages.push({ role: 'user', content: 'describe this image' })

        // Verify messages have base64 for model invoke
        expect(messages[0].content[0].type).toBe('image_url')
        expect(messages[0].content[0].image_url.url).toMatch(/^data:/)

        // Step 2: After invoke, revert to file refs for storage
        const reverted: any[] = revertBase64ImagesToFileRefs(messages) as any[]

        expect(reverted[0]).toEqual({
            role: 'user',
            content: [{ type: 'stored-file', name: 'cat.png', mime: 'image/png' }]
        })
        expect(reverted[1]).toEqual({ role: 'user', content: 'describe this image' })
    })

    it('processMessagesWithImages: stored-file → base64 → revert', async () => {
        const options = { chatflowid: 'flow1', chatId: 'chat1', orgId: 'org1' }

        const messages: any[] = [
            { role: 'user', content: [{ type: 'stored-file', name: 'diagram.png', mime: 'image/png' }] },
            { role: 'user', content: 'explain this diagram' },
            { role: 'assistant', content: 'This is a flowchart...' }
        ]

        // Convert stored-file → base64 (as handleMemory does)
        const { updatedMessages } = await processMessagesWithImages(messages, options)

        expect((updatedMessages[0] as any).content[0].type).toBe('image_url')
        expect((updatedMessages[0] as any).content[0]._fileName).toBe('diagram.png')

        // Revert for storage
        const reverted: any[] = revertBase64ImagesToFileRefs(updatedMessages) as any[]

        expect(reverted[0]).toEqual({
            role: 'user',
            content: [{ type: 'stored-file', name: 'diagram.png', mime: 'image/png' }]
        })
        expect(reverted[1]).toEqual({ role: 'user', content: 'explain this diagram' })
        expect(reverted[2]).toEqual({ role: 'assistant', content: 'This is a flowchart...' })
    })

    it('artifact images: insert temp → filter → revert', async () => {
        const options = { chatflowid: 'flow1', chatId: 'chat1', orgId: 'org1' }

        const messages: any[] = [
            { role: 'user', content: 'generate an image of a cat' },
            {
                role: 'assistant',
                content: 'Here is your cat image',
                additional_kwargs: { artifacts: [{ type: 'png', data: 'uploads/cat_gen.png' }] }
            },
            { role: 'user', content: 'make it blue' }
        ]

        // Step 1: addImageArtifactsToMessages inserts temp base64 message
        await addImageArtifactsToMessages(messages, options)

        expect(messages).toHaveLength(4)
        expect(messages[2]._isTemporaryImageMessage).toBe(true)

        // Step 2: Filter temp messages (as Agent.ts does after invoke)
        const stored = messages.filter((m: any) => !m._isTemporaryImageMessage)
        expect(stored).toHaveLength(3)

        // Step 3: Revert remaining base64 — none should remain since temp was removed
        const reverted: any[] = revertBase64ImagesToFileRefs(stored) as any[]

        expect(reverted[0]).toEqual({ role: 'user', content: 'generate an image of a cat' })
        expect(reverted[2]).toEqual({ role: 'user', content: 'make it blue' })
    })
})

describe('sanitizeFileName', () => {
    it('returns a plain filename as-is', () => {
        expect(sanitizeFileName('photo.jpg')).toBe('photo.jpg')
    })

    it('strips FILE-STORAGE:: prefix', () => {
        expect(sanitizeFileName('FILE-STORAGE::photo.jpg')).toBe('photo.jpg')
    })

    it('strips path traversal sequences', () => {
        expect(sanitizeFileName('../../../../etc/passwd')).toBe('passwd')
        expect(sanitizeFileName('../../../secret.txt')).toBe('secret.txt')
    })

    it('strips absolute paths', () => {
        expect(sanitizeFileName('/etc/passwd')).toBe('passwd')
        expect(sanitizeFileName('C:\\Windows\\system32\\config.sys')).toBe('config.sys')
    })

    it('strips FILE-STORAGE:: prefix combined with traversal', () => {
        expect(sanitizeFileName('FILE-STORAGE::../../etc/shadow')).toBe('shadow')
    })

    it('throws on empty or dot-only names', () => {
        expect(() => sanitizeFileName('')).toThrow()
        expect(() => sanitizeFileName('..')).toThrow()
        expect(() => sanitizeFileName('FILE-STORAGE::')).toThrow()
    })

    it('handles names with subdirectory components', () => {
        expect(sanitizeFileName('uploads/subfolder/image.png')).toBe('image.png')
    })

    it('strips URL-encoded path traversal sequences', () => {
        // %2e%2e%2f = ../  — decoded then basename-extracted
        expect(sanitizeFileName('%2e%2e%2fetc%2fpasswd')).toBe('passwd')
    })

    it('rejects double-encoded traversal attempts', () => {
        // %252e decodes to %2e which isUnsafeFilePath catches — must throw
        expect(() => sanitizeFileName('%252e%252e%252fpasswd')).toThrow()
    })

    it('strips backslash-based traversal (Windows)', () => {
        expect(sanitizeFileName('..\\..\\Windows\\system.ini')).toBe('system.ini')
    })
})

describe('path traversal prevention in image processing', () => {
    it('_addImagesToMessages sanitizes filenames with traversal', async () => {
        const options = {
            uploads: [{ type: 'stored-file', name: '../../../../etc/passwd', mime: 'image/jpeg', data: '' }],
            chatflowid: 'flow1',
            chatId: 'chat1',
            orgId: 'org1'
        }
        const modelConfig = { allowImageUploads: true }

        const result = await getUniqueImageMessages(options, [], modelConfig)

        expect(result).toBeDefined()
        const content = (result!.imageMessageWithBase64 as any).content[0]
        // _fileName should be sanitized to just the basename
        expect(content._fileName).toBe('passwd')
        expect(content._fileName).not.toContain('..')
    })

    it('processMessagesWithImages sanitizes stored-file names', async () => {
        const options = { chatflowid: 'flow1', chatId: 'chat1', orgId: 'org1' }
        const messages: any[] = [{ role: 'user', content: [{ type: 'stored-file', name: '../../../secret.png', mime: 'image/png' }] }]

        const { updatedMessages } = await processMessagesWithImages(messages, options)
        const content = (updatedMessages[0] as any).content[0]

        expect(content._fileName).toBe('secret.png')
        expect(content._fileName).not.toContain('..')
    })

    it('addImageArtifactsToMessages sanitizes LLM-controlled artifact paths (prompt injection)', async () => {
        const options = { chatflowid: 'flow1', chatId: 'chat1', orgId: 'org1' }
        const messages: any[] = [
            {
                role: 'assistant',
                content: 'Here is your image',
                additional_kwargs: {
                    artifacts: [{ type: 'png', data: '../../../../etc/shadow' }]
                }
            }
        ]

        await addImageArtifactsToMessages(messages, options)

        expect(messages).toHaveLength(2)
        const inserted = messages[1]
        expect(inserted._isTemporaryImageMessage).toBe(true)
        // The _fileName must be sanitized — no traversal sequences
        expect(inserted.content[0]._fileName).toBe('shadow')
        expect(inserted.content[0]._fileName).not.toContain('..')
        expect(inserted.content[0]._fileName).not.toContain('/')
    })

    it('addImageArtifactsToMessages sanitizes URL-encoded artifact paths', async () => {
        const options = { chatflowid: 'flow1', chatId: 'chat1', orgId: 'org1' }
        const messages: any[] = [
            {
                role: 'assistant',
                content: 'Image ready',
                additional_kwargs: {
                    artifacts: [{ type: 'png', data: 'uploads%2f..%2f..%2f..%2fetc%2fpasswd' }]
                }
            }
        ]

        await addImageArtifactsToMessages(messages, options)

        expect(messages).toHaveLength(2)
        expect(messages[1].content[0]._fileName).toBe('passwd')
        expect(messages[1].content[0]._fileName).not.toContain('..')
    })
})
