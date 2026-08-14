import { beforeEach, describe, expect, it, jest } from '@jest/globals'

jest.mock('./getRunningExpressApp', () => ({
    getRunningExpressApp: jest.fn()
}))

import { utilGetChatMessage } from './getChatMessage'
import { getRunningExpressApp } from './getRunningExpressApp'
import { ChatFlow } from '../database/entities/ChatFlow'

const mockFindOneBy = jest.fn() as jest.Mock
const mockFind = jest.fn() as jest.Mock

describe('utilGetChatMessage', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        ;(getRunningExpressApp as jest.Mock).mockReturnValue({
            AppDataSource: {
                getRepository: jest.fn((entity: unknown) => {
                    if (entity === ChatFlow) {
                        return { findOneBy: mockFindOneBy }
                    }

                    return { find: mockFind }
                })
            }
        })

        mockFindOneBy.mockImplementation(() => Promise.resolve({ id: 'flow-1', workspaceId: 'ws-1' }))
        mockFind.mockImplementation(() => Promise.resolve([]))
    })

    it('applies skip and take for standard paginated queries', async () => {
        await utilGetChatMessage({
            chatflowid: 'flow-1',
            activeWorkspaceId: 'ws-1',
            page: 2,
            pageSize: 25
        })

        expect(mockFind).toHaveBeenCalledWith(
            expect.objectContaining({
                skip: 25,
                take: 25,
                order: { createdDate: 'ASC' }
            })
        )
    })

    it('does not apply pagination when page and pageSize are not provided', async () => {
        await utilGetChatMessage({
            chatflowid: 'flow-1',
            activeWorkspaceId: 'ws-1'
        })

        expect(mockFind).toHaveBeenCalledWith(
            expect.objectContaining({
                skip: undefined,
                take: undefined
            })
        )
    })
})
