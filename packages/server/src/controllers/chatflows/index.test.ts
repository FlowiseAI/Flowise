jest.mock('../../database/entities/ChatFlow', () => ({
    ChatFlow: class ChatFlow {}
}))

jest.mock('../../enterprise/services/workspace-user.service', () => ({
    WorkspaceUserErrorMessage: {
        WORKSPACE_USER_NOT_FOUND: 'Workspace user not found'
    },
    WorkspaceUserService: jest.fn()
}))

jest.mock('../../services/chatflows', () => ({
    __esModule: true,
    default: {
        getAllChatflowsCountByOrganization: jest.fn(),
        saveChatflow: jest.fn()
    }
}))

jest.mock('../../utils/getRunningExpressApp', () => ({
    getRunningExpressApp: jest.fn().mockReturnValue({ usageCacheManager: {} })
}))

jest.mock('../../utils/quotaUsage', () => ({
    checkUsageLimit: jest.fn().mockResolvedValue(undefined)
}))

jest.mock('../../utils/rateLimit', () => ({
    RateLimiterManager: {
        getInstance: jest.fn().mockReturnValue({ updateRateLimiter: jest.fn() })
    }
}))

jest.mock('../../utils/sanitizeFlowData', () => ({
    sanitizeFlowDataForPublicEndpoint: jest.fn()
}))

jest.mock('../../services/apikey', () => ({
    __esModule: true,
    default: {}
}))

jest.mock('../../services/schedule', () => ({
    __esModule: true,
    default: {}
}))

jest.mock('../../schedule/ScheduleBeat', () => ({
    ScheduleBeat: {
        getInstance: jest.fn().mockReturnValue({ onScheduleChanged: jest.fn() })
    }
}))

import chatflowsController from './index'
import chatflowsService from '../../services/chatflows'
import { checkUsageLimit } from '../../utils/quotaUsage'

const mockChatflowsService = chatflowsService as jest.Mocked<typeof chatflowsService>
const mockCheckUsageLimit = checkUsageLimit as jest.Mock

describe('chatflowsController.saveChatflow', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockChatflowsService.getAllChatflowsCountByOrganization.mockResolvedValue(0)
        mockChatflowsService.saveChatflow.mockImplementation(async (chatflow) => chatflow)
        mockCheckUsageLimit.mockResolvedValue(undefined)
    })

    it('preserves a caller-provided chatflow id when creating a chatflow', async () => {
        const chatflowId = '11111111-1111-4111-8111-111111111111'
        const req = {
            body: {
                id: chatflowId,
                name: 'Restored flow',
                flowData: JSON.stringify({ nodes: [], edges: [] }),
                type: 'CHATFLOW'
            },
            user: {
                activeOrganizationId: 'org-1',
                activeWorkspaceId: 'ws-1',
                activeOrganizationSubscriptionId: 'sub-1'
            }
        }
        const res = { json: jest.fn() }
        const next = jest.fn()

        await chatflowsController.saveChatflow(req as any, res as any, next)

        expect(next).not.toHaveBeenCalled()
        expect(mockChatflowsService.saveChatflow).toHaveBeenCalledWith(
            expect.objectContaining({
                id: chatflowId,
                workspaceId: 'ws-1'
            }),
            'org-1',
            'ws-1',
            'sub-1',
            {}
        )
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: chatflowId }))
    })
})
