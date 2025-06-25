jest.mock('axios')
jest.mock('../../../../src/utils', () => ({
    getCredentialData: jest.fn(() => Promise.resolve({ botToken: 'FAKE', apiVersion: 'v10' })),
    getCredentialParam: jest.fn((key, creds) => creds[key])
}))

import axios from 'axios'
import DiscordMessageSend from '../../../../nodes/agentflow/Discord/messages/Send'
import { INodeData, ICommonObject } from '../../../../src/Interface'

describe('DiscordMessageSend', () => {
    let node: DiscordMessageSend
    const baseNodeData = {
        id: 'discord_1',
        inputs: {
            channelId: '12345678901234567',
            content: 'Hello world',
            replyToMessageId: '',
            embedTitle: '',
            embedDescription: '',
            embedColor: '',
            embedUrl: '',
            embedThumbnail: '',
            embedImage: ''
        }
    } as unknown as INodeData

    const options = { agentflowRuntime: { state: {} } } as ICommonObject

    beforeEach(() => {
        node = new DiscordMessageSend('discord')
        ;(axios.post as jest.Mock).mockReset()
    })

    it('throws if channelId is missing', async () => {
        const bad = { ...baseNodeData, inputs: { ...baseNodeData.inputs, channelId: '' } }
        await expect(node.run(bad, '', options)).rejects.toThrow('Channel ID is required')
    })
    it('throws if neither content nor embed is provided', async () => {
        const noContent = { ...baseNodeData, inputs: { ...baseNodeData.inputs, content: '' } }
        await expect(node.run(noContent, '', options)).rejects.toThrow('Message must have either content or embed')
    })

    it('sends a plain text message successfully', async () => {
        const fakeResponse = { data: { id: 'm1', content: 'Hello world', timestamp: '2025-06-10T00:00:00Z' } }
        ;(axios.post as jest.Mock).mockResolvedValue(fakeResponse)

        const result = await node.run(baseNodeData, 'run1', options)

        // Verify axios was called correctly
        expect(axios.post).toHaveBeenCalledWith(
            'https://discord.com/api/v10/channels/12345678901234567/messages',
            { content: 'Hello world' },
            expect.any(Object)
        )

        // Verify returned structure
        expect(result.output.form.metadata).toEqual({
            channelId: '12345678901234567',
            messageId: 'm1',
            sentAt: '2025-06-10T00:00:00Z',
            isReply: false
        })
    })

    it('builds an embed when embed fields are set', async () => {
        ;(axios.post as jest.Mock).mockResolvedValue({ data: { id: 'm2', content: '', embeds: [{}], timestamp: '2025-06-10T01:00:00Z' } })

        const withEmbed = {
            ...baseNodeData,
            inputs: {
                ...baseNodeData.inputs,
                content: '',
                embedTitle: 'Title',
                embedDescription: 'Desc',
                embedColor: '#FF0000'
            }
        }

        const result = await node.run(withEmbed, 'run2', options)
        expect(axios.post).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                embeds: [
                    expect.objectContaining({
                        title: 'Title',
                        description: 'Desc',
                        color: 0xff0000
                    })
                ]
            }),
            expect.any(Object)
        )
        expect(result.output.form.metadata.isReply).toBe(false)
    })
})
