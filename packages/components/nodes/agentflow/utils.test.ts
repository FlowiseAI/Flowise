import { revertBase64ImagesToFileRefs, processMessagesWithImages, addImageArtifactsToMessages, getUniqueImageMessages } from './utils'
import { sanitizeFileName } from '../../src/validator'
import { IChatMessage, IMultimodalContentItem } from './Interface.Agentflow'
import { IFileUpload } from '../../src/Interface'

// Mock storageUtils
jest.mock('../../src/storageUtils', () => ({
    getFileFromStorage: jest.fn().mockResolvedValue(Buffer.from('fake-image-data')),
    addSingleFileToStorage: jest.fn().mockResolvedValue({ path: 'mock/path', totalSize: 100 })
}))

// Mock multiModalUtils
jest.mock('../../src/multiModalUtils', () => ({
    getImageUploads: jest.fn((uploads: IFileUpload[]) => uploads.filter((u) => u.mime?.startsWith('image/')))
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
        const messages: IChatMessage[] = [
            {
                role: 'user',
                content: [
                    {
                        type: 'image_url',
                        image_url: { url: 'data:image/jpeg;base64,abc123' }
                    }
                ],
                additional_kwargs: {
                    _imageFileRefs: [{ index: 0, fileName: 'photo.jpg', mime: 'image/jpeg' }]
                }
            },
            { role: 'user', content: 'what is this' }
        ]

        const result = revertBase64ImagesToFileRefs(messages) as IChatMessage[]

        expect(result[0]).toEqual({
            role: 'user',
            content: [{ type: 'stored-file', name: 'photo.jpg', mime: 'image/jpeg' }]
        })
        expect(result[1]).toEqual({ role: 'user', content: 'what is this' })
    })

    it('leaves untagged image_url items (external URLs) untouched', () => {
        const messages: IChatMessage[] = [
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

        const result = revertBase64ImagesToFileRefs(messages) as IChatMessage[]

        expect((result[0].content as IMultimodalContentItem[])[0]).toEqual({
            type: 'image_url',
            image_url: { url: 'https://example.com/image.png' }
        })
    })

    it('handles mixed tagged and untagged items in the same message', () => {
        const messages: IChatMessage[] = [
            {
                role: 'user',
                content: [
                    {
                        type: 'image_url',
                        image_url: { url: 'data:image/png;base64,xyz' }
                    },
                    {
                        type: 'image_url',
                        image_url: { url: 'https://example.com/photo.jpg' }
                    }
                ],
                additional_kwargs: {
                    _imageFileRefs: [{ index: 0, fileName: 'screenshot.png', mime: 'image/png' }]
                }
            }
        ]

        const result = revertBase64ImagesToFileRefs(messages) as IChatMessage[]
        const content = result[0].content as IMultimodalContentItem[]

        expect(content[0]).toEqual({ type: 'stored-file', name: 'screenshot.png', mime: 'image/png' })
        expect(content[1]).toEqual({ type: 'image_url', image_url: { url: 'https://example.com/photo.jpg' } })
    })

    it('handles multiple messages with multiple images each', () => {
        const messages: IChatMessage[] = [
            {
                role: 'user',
                content: [
                    { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,a' } },
                    { type: 'image_url', image_url: { url: 'data:image/png;base64,b' } }
                ],
                additional_kwargs: {
                    _imageFileRefs: [
                        { index: 0, fileName: 'img1.jpg', mime: 'image/jpeg' },
                        { index: 1, fileName: 'img2.png', mime: 'image/png' }
                    ]
                }
            },
            {
                role: 'user',
                content: [{ type: 'image_url', image_url: { url: 'data:image/gif;base64,c' } }],
                additional_kwargs: {
                    _imageFileRefs: [{ index: 0, fileName: 'img3.gif', mime: 'image/gif' }]
                }
            }
        ]

        const result = revertBase64ImagesToFileRefs(messages) as IChatMessage[]
        const content0 = result[0].content as IMultimodalContentItem[]
        const content1 = result[1].content as IMultimodalContentItem[]

        expect(content0[0]).toEqual({ type: 'stored-file', name: 'img1.jpg', mime: 'image/jpeg' })
        expect(content0[1]).toEqual({ type: 'stored-file', name: 'img2.png', mime: 'image/png' })
        expect(content1[0]).toEqual({ type: 'stored-file', name: 'img3.gif', mime: 'image/gif' })
    })

    it('does not mutate the original messages', () => {
        const original: IChatMessage[] = [
            {
                role: 'user',
                content: [{ type: 'image_url', image_url: { url: 'data:image/jpeg;base64,abc' } }],
                additional_kwargs: {
                    _imageFileRefs: [{ index: 0, fileName: 'test.jpg', mime: 'image/jpeg' }]
                }
            }
        ]

        const originalJson = JSON.stringify(original)
        revertBase64ImagesToFileRefs(original)

        expect(JSON.stringify(original)).toBe(originalJson)
    })

    it('handles messages with string content (no array)', () => {
        const messages: IChatMessage[] = [
            { role: 'user', content: 'hello world' },
            { role: 'assistant', content: 'hi there' }
        ]

        const result = revertBase64ImagesToFileRefs(messages) as IChatMessage[]

        expect(result).toEqual(messages)
    })

    it('handles empty messages array', () => {
        const result = revertBase64ImagesToFileRefs([])
        expect(result).toEqual([])
    })

    it('skips non-image_url array content items', () => {
        const messages: IChatMessage[] = [
            {
                role: 'user',
                content: [
                    { type: 'text', text: 'describe this' },
                    { type: 'image_url', image_url: { url: 'data:image/png;base64,x' } }
                ],
                additional_kwargs: {
                    _imageFileRefs: [{ index: 1, fileName: 'pic.png', mime: 'image/png' }]
                }
            }
        ]

        const result = revertBase64ImagesToFileRefs(messages) as IChatMessage[]
        const content = result[0].content as IMultimodalContentItem[]

        expect(content[0]).toEqual({ type: 'text', text: 'describe this' })
        expect(content[1]).toEqual({ type: 'stored-file', name: 'pic.png', mime: 'image/png' })
    })

    it('cleans up additional_kwargs when _imageFileRefs is the only key', () => {
        const messages: IChatMessage[] = [
            {
                role: 'user',
                content: [{ type: 'image_url', image_url: { url: 'data:image/png;base64,x' } }],
                additional_kwargs: {
                    _imageFileRefs: [{ index: 0, fileName: 'pic.png', mime: 'image/png' }]
                }
            }
        ]

        const result = revertBase64ImagesToFileRefs(messages) as IChatMessage[]

        expect(result[0].additional_kwargs).toBeUndefined()
    })

    it('preserves other additional_kwargs when removing _imageFileRefs', () => {
        const messages: IChatMessage[] = [
            {
                role: 'user',
                content: [{ type: 'image_url', image_url: { url: 'data:image/png;base64,x' } }],
                additional_kwargs: {
                    _imageFileRefs: [{ index: 0, fileName: 'pic.png', mime: 'image/png' }],
                    artifacts: [{ type: 'png', data: 'some/path' }]
                }
            }
        ]

        const result = revertBase64ImagesToFileRefs(messages) as IChatMessage[]

        expect(result[0].additional_kwargs?._imageFileRefs).toBeUndefined()
        expect(result[0].additional_kwargs?.artifacts).toEqual([{ type: 'png', data: 'some/path' }])
    })
})

describe('processMessagesWithImages', () => {
    const options = { chatflowid: 'flow1', chatId: 'chat1', orgId: 'org1' }

    it('converts stored-file refs to base64 with file refs in additional_kwargs', async () => {
        const messages: IChatMessage[] = [{ role: 'user', content: [{ type: 'stored-file', name: 'photo.jpg', mime: 'image/jpeg' }] }]

        const { updatedMessages } = await processMessagesWithImages(messages, options)
        const msg = updatedMessages[0] as IChatMessage
        const content = (msg.content as IMultimodalContentItem[])[0]

        expect(content.type).toBe('image_url')
        expect(content.image_url?.url).toMatch(/^data:image\/jpeg;base64,/)
        expect(content._fileName).toBeUndefined()
        expect(content._mime).toBeUndefined()
        expect(msg.additional_kwargs?._imageFileRefs).toEqual([{ index: 0, fileName: 'photo.jpg', mime: 'image/jpeg' }])
    })

    it('returns original messages when chatflowid or chatId is missing', async () => {
        const messages: IChatMessage[] = [{ role: 'user', content: [{ type: 'stored-file', name: 'a.png', mime: 'image/png' }] }]

        const { updatedMessages, transformedMessages } = await processMessagesWithImages(messages, { chatflowid: '', chatId: '' })

        expect(updatedMessages).toBe(messages)
        expect(transformedMessages).toEqual([])
    })

    it('skips non-user messages', async () => {
        const messages: IChatMessage[] = [{ role: 'assistant', content: [{ type: 'stored-file', name: 'a.png', mime: 'image/png' }] }]

        const { updatedMessages } = await processMessagesWithImages(messages, options)
        const content = ((updatedMessages[0] as IChatMessage).content as IMultimodalContentItem[])[0]

        expect(content.type).toBe('stored-file')
    })

    it('tracks transformed messages for revert', async () => {
        const messages: IChatMessage[] = [{ role: 'user', content: [{ type: 'stored-file', name: 'img.png', mime: 'image/png' }] }]

        const { transformedMessages } = await processMessagesWithImages(messages, options)

        expect(transformedMessages).toHaveLength(1)
        expect(transformedMessages[0]).toEqual({
            role: 'user',
            content: [{ type: 'stored-file', name: 'img.png', mime: 'image/png' }]
        })
    })

    it('does not mutate the original messages', async () => {
        const messages: IChatMessage[] = [{ role: 'user', content: [{ type: 'stored-file', name: 'img.png', mime: 'image/png' }] }]

        await processMessagesWithImages(messages, options)
        const content = (messages[0].content as IMultimodalContentItem[])[0]

        expect(content.type).toBe('stored-file')
    })
})

describe('addImageArtifactsToMessages', () => {
    const options = { chatflowid: 'flow1', chatId: 'chat1', orgId: 'org1' }

    it('inserts temporary base64 user message after assistant message with image artifacts', async () => {
        const messages: IChatMessage[] = [
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
        const inserted = messages[1] as IChatMessage
        expect(inserted.role).toBe('user')
        expect(inserted._isTemporaryImageMessage).toBe(true)
        const content = (inserted.content as IMultimodalContentItem[])[0]
        expect(content.type).toBe('image_url')
        expect(content._fileName).toBeUndefined()
        expect(inserted.additional_kwargs?._imageFileRefs?.[0].fileName).toBe('generated_image.png')
        expect(inserted.additional_kwargs?._imageFileRefs?.[0].mime).toBe('image/png')
    })

    it('does not insert duplicate if next message already has the image', async () => {
        const messages: IChatMessage[] = [
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
        const messages: IChatMessage[] = [
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
        const messages: IChatMessage[] = [
            { role: 'user', content: 'hello' },
            { role: 'assistant', content: 'hi' }
        ]

        await addImageArtifactsToMessages(messages, options)

        expect(messages).toHaveLength(2)
    })

    it('handles multiple assistant messages with image artifacts', async () => {
        const messages: IChatMessage[] = [
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
        const msg1 = messages[1] as IChatMessage
        const msg4 = messages[4] as IChatMessage
        expect(msg1._isTemporaryImageMessage).toBe(true)
        expect(msg1.additional_kwargs?._imageFileRefs?.[0].fileName).toBe('img1.png')
        expect(msg4._isTemporaryImageMessage).toBe(true)
        expect(msg4.additional_kwargs?._imageFileRefs?.[0].fileName).toBe('img2.jpg')
    })
})

describe('getUniqueImageMessages', () => {
    it('returns base64 message with file refs in additional_kwargs', async () => {
        const options = {
            uploads: [{ type: 'stored-file', name: 'photo.jpg', mime: 'image/jpeg', data: '' }],
            chatflowid: 'flow1',
            chatId: 'chat1',
            orgId: 'org1'
        }
        const modelConfig = { allowImageUploads: true }

        const result = await getUniqueImageMessages(options, [], modelConfig)

        expect(result).toBeDefined()
        const msg = result!.imageMessageWithBase64 as IChatMessage
        const content = (msg.content as IMultimodalContentItem[])[0]
        expect(content.type).toBe('image_url')
        expect(content._fileName).toBeUndefined()
        expect(msg.additional_kwargs?._imageFileRefs?.[0].fileName).toBe('photo.jpg')
        expect(msg.additional_kwargs?._imageFileRefs?.[0].mime).toBe('image/jpeg')
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
        const messages: IChatMessage[] = [
            {
                role: 'user',
                content: [
                    {
                        type: 'image_url',
                        image_url: { url: existingBase64, detail: 'low' }
                    }
                ],
                additional_kwargs: {
                    _imageFileRefs: [{ index: 0, fileName: 'photo.jpg', mime: 'image/jpeg' }]
                }
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
        const messages: IChatMessage[] = []
        const imageContents = await getUniqueImageMessages(options, messages, modelConfig)
        if (imageContents) {
            messages.push(imageContents.imageMessageWithBase64 as IChatMessage)
        }
        messages.push({ role: 'user', content: 'describe this image' })

        // Verify messages have base64 for model invoke
        const content0 = (messages[0].content as IMultimodalContentItem[])[0]
        expect(content0.type).toBe('image_url')
        expect(content0.image_url?.url).toMatch(/^data:/)
        // No _fileName on content items
        expect(content0._fileName).toBeUndefined()

        // Step 2: After invoke, revert to file refs for storage
        const reverted = revertBase64ImagesToFileRefs(messages) as IChatMessage[]

        expect(reverted[0]).toEqual({
            role: 'user',
            content: [{ type: 'stored-file', name: 'cat.png', mime: 'image/png' }]
        })
        expect(reverted[1]).toEqual({ role: 'user', content: 'describe this image' })
    })

    it('processMessagesWithImages: stored-file → base64 → revert', async () => {
        const options = { chatflowid: 'flow1', chatId: 'chat1', orgId: 'org1' }

        const messages: IChatMessage[] = [
            { role: 'user', content: [{ type: 'stored-file', name: 'diagram.png', mime: 'image/png' }] },
            { role: 'user', content: 'explain this diagram' },
            { role: 'assistant', content: 'This is a flowchart...' }
        ]

        // Convert stored-file → base64 (as handleMemory does)
        const { updatedMessages } = await processMessagesWithImages(messages, options)
        const msg0 = updatedMessages[0] as IChatMessage
        const content0 = (msg0.content as IMultimodalContentItem[])[0]

        expect(content0.type).toBe('image_url')
        // File refs are in additional_kwargs, not on content items
        expect(content0._fileName).toBeUndefined()
        expect(msg0.additional_kwargs?._imageFileRefs?.[0].fileName).toBe('diagram.png')

        // Revert for storage
        const reverted = revertBase64ImagesToFileRefs(updatedMessages) as IChatMessage[]

        expect(reverted[0]).toEqual({
            role: 'user',
            content: [{ type: 'stored-file', name: 'diagram.png', mime: 'image/png' }]
        })
        expect(reverted[1]).toEqual({ role: 'user', content: 'explain this diagram' })
        expect(reverted[2]).toEqual({ role: 'assistant', content: 'This is a flowchart...' })
    })

    it('artifact images: insert temp → filter → revert', async () => {
        const options = { chatflowid: 'flow1', chatId: 'chat1', orgId: 'org1' }

        const messages: IChatMessage[] = [
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
        expect((messages[2] as IChatMessage)._isTemporaryImageMessage).toBe(true)

        // Step 2: Filter temp messages (as Agent.ts does after invoke)
        const stored = messages.filter((m) => !(m as IChatMessage)._isTemporaryImageMessage)
        expect(stored).toHaveLength(3)

        // Step 3: Revert remaining base64 — none should remain since temp was removed
        const reverted = revertBase64ImagesToFileRefs(stored) as IChatMessage[]

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
        expect(sanitizeFileName('%2e%2e%2fetc%2fpasswd')).toBe('passwd')
    })

    it('rejects double-encoded traversal attempts', () => {
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
        const msg = result!.imageMessageWithBase64 as IChatMessage
        const fileRef = msg.additional_kwargs?._imageFileRefs?.[0]
        expect(fileRef?.fileName).toBe('passwd')
        expect(fileRef?.fileName).not.toContain('..')
    })

    it('processMessagesWithImages sanitizes stored-file names', async () => {
        const options = { chatflowid: 'flow1', chatId: 'chat1', orgId: 'org1' }
        const messages: IChatMessage[] = [
            { role: 'user', content: [{ type: 'stored-file', name: '../../../secret.png', mime: 'image/png' }] }
        ]

        const { updatedMessages } = await processMessagesWithImages(messages, options)
        const msg = updatedMessages[0] as IChatMessage
        const fileRef = msg.additional_kwargs?._imageFileRefs?.[0]

        expect(fileRef?.fileName).toBe('secret.png')
        expect(fileRef?.fileName).not.toContain('..')
    })

    it('addImageArtifactsToMessages sanitizes LLM-controlled artifact paths (prompt injection)', async () => {
        const options = { chatflowid: 'flow1', chatId: 'chat1', orgId: 'org1' }
        const messages: IChatMessage[] = [
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
        const inserted = messages[1] as IChatMessage
        expect(inserted._isTemporaryImageMessage).toBe(true)
        const fileRef = inserted.additional_kwargs?._imageFileRefs?.[0]
        expect(fileRef?.fileName).toBe('shadow')
        expect(fileRef?.fileName).not.toContain('..')
        expect(fileRef?.fileName).not.toContain('/')
    })

    it('addImageArtifactsToMessages sanitizes URL-encoded artifact paths', async () => {
        const options = { chatflowid: 'flow1', chatId: 'chat1', orgId: 'org1' }
        const messages: IChatMessage[] = [
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
        const fileRef = (messages[1] as IChatMessage).additional_kwargs?._imageFileRefs?.[0]
        expect(fileRef?.fileName).toBe('passwd')
        expect(fileRef?.fileName).not.toContain('..')
    })
})
