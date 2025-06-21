jest.mock('axios')
jest.mock('../../../../src/utils', () => ({
    getCredentialData: jest.fn(() => Promise.resolve({ botToken: 'FAKE', apiVersion: 'v10' })),
    getCredentialParam: jest.fn((key, creds) => creds[key])
}))

import axios from 'axios'
import DiscordMessageRetrieve from '../../../../nodes/agentflow/Discord/messages/Retrieve'
import { INodeData, ICommonObject } from '../../../../src/Interface'

describe('DiscordMessageRetrieve', () => {
    let node: DiscordMessageRetrieve
    const baseNodeData = {
        id: 'discord_2',
        inputs: {
            channelId: '12345678901234567',
            limit: 3,
            beforeId: '',
            afterId: '',
            aroundId: ''
        }
    } as unknown as INodeData

    const options = { agentflowRuntime: { state: {} } } as ICommonObject

    beforeEach(() => {
        node = new DiscordMessageRetrieve('discord')
        ;(axios.get as jest.Mock).mockReset()
    })

    it('throws if multiple pagination params are set', async () => {
        const bad = { ...baseNodeData, inputs: { ...baseNodeData.inputs, beforeId: '1', afterId: '2' } }
        await expect(node.run(bad, '', options)).rejects.toThrow('Only one of beforeId, afterId, or aroundId may be provided')
    })

    it('retrieves recent messages by default', async () => {
        const fakeMsgs = [{ id: 'm1' }, { id: 'm2' }]
        ;(axios.get as jest.Mock).mockResolvedValue({ data: fakeMsgs })

        const result = await node.run(baseNodeData, 'run3', options)
        expect(axios.get).toHaveBeenCalledWith(
            'https://discord.com/api/v10/channels/12345678901234567/messages?limit=3',
            expect.any(Object)
        )
        expect(result.output.form.messages).toHaveLength(2)
        expect(result.output.form.metadata.paginationType).toBe('recent')
    })
})
