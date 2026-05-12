import { beforeEach, describe, expect, it, jest } from '@jest/globals'

jest.mock(
    'typeorm',
    () => {
        const noop = () => (_target: any, _key?: any) => {}
        return {
            Entity: () => noop(),
            Column: () => noop(),
            PrimaryGeneratedColumn: () => noop(),
            PrimaryColumn: () => noop(),
            CreateDateColumn: () => noop(),
            UpdateDateColumn: () => noop(),
            DeleteDateColumn: () => noop(),
            ManyToOne: () => noop(),
            OneToMany: () => noop(),
            OneToOne: () => noop(),
            JoinColumn: () => noop(),
            JoinTable: () => noop(),
            Index: () => noop(),
            Unique: () => noop(),
            Tree: () => noop(),
            TreeChildren: () => noop(),
            TreeParent: () => noop(),
            MoreThanOrEqual: jest.fn((value: Date) => ({ type: 'moreThanOrEqual', value })),
            LessThanOrEqual: jest.fn((value: Date) => ({ type: 'lessThanOrEqual', value })),
            Between: jest.fn((from: Date, to: Date) => ({ type: 'between', from, to })),
            In: jest.fn((value: unknown[]) => ({ type: 'in', value }))
        }
    },
    { virtual: true }
)

jest.mock('../database/entities/ChatFlow', () => ({
    ChatFlow: class ChatFlow {}
}))

jest.mock('../database/entities/ChatMessageFeedback', () => ({
    ChatMessageFeedback: class ChatMessageFeedback {}
}))

const mockFindOneBy: any = jest.fn()
const mockFind: any = jest.fn()
const mockCreateQueryBuilder: any = jest.fn()
const mockGetRepository: any = jest.fn((entity: unknown) => {
    const entityName = (entity as { name?: string })?.name
    if (entityName === 'ChatFlow') {
        return { findOneBy: mockFindOneBy }
    }
    return {
        find: mockFind,
        createQueryBuilder: mockCreateQueryBuilder
    }
})

jest.mock('../utils/getRunningExpressApp', () => ({
    getRunningExpressApp: jest.fn(() => ({
        AppDataSource: {
            getRepository: mockGetRepository
        }
    }))
}))

import { utilGetChatMessage } from './getChatMessage'

describe('utilGetChatMessage', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockFindOneBy.mockResolvedValue({ id: 'flow-1', workspaceId: 'ws-1' })
        mockFind.mockResolvedValue([{ id: 'msg-1' }])
        mockCreateQueryBuilder.mockReset()
    })

    it('applies skip/take pagination in the non-feedback branch', async () => {
        await utilGetChatMessage({
            chatflowid: 'flow-1',
            chatTypes: ['EXTERNAL' as any],
            sortOrder: 'DESC',
            activeWorkspaceId: 'ws-1',
            page: 2,
            pageSize: 10
        })

        expect(mockFind).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    chatflowid: 'flow-1'
                }),
                order: {
                    createdDate: 'DESC'
                },
                skip: 10,
                take: 10
            })
        )
    })

    it('does not paginate when page/pageSize are not provided', async () => {
        await utilGetChatMessage({
            chatflowid: 'flow-1',
            activeWorkspaceId: 'ws-1'
        })

        expect(mockFind).toHaveBeenCalledWith(
            expect.not.objectContaining({
                skip: expect.anything(),
                take: expect.anything()
            })
        )
    })
})
