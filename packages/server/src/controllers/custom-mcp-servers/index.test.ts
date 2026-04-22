import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'

jest.mock('../../services/custom-mcp-servers', () => ({
    __esModule: true,
    default: {
        createCustomMcpServer: jest.fn(),
        getAllCustomMcpServers: jest.fn(),
        getCustomMcpServerById: jest.fn(),
        updateCustomMcpServer: jest.fn(),
        deleteCustomMcpServer: jest.fn(),
        authorizeCustomMcpServer: jest.fn(),
        getDiscoveredTools: jest.fn()
    }
}))

jest.mock('../../utils/pagination', () => ({
    getPageAndLimitParams: jest.fn()
}))

import customMcpServersController from './index'
import customMcpServersService from '../../services/custom-mcp-servers'
import { getPageAndLimitParams } from '../../utils/pagination'

const mockService = customMcpServersService as jest.Mocked<typeof customMcpServersService>
const mockGetPageAndLimitParams = getPageAndLimitParams as jest.Mock

const makeReq = (overrides: Partial<Request> = {}): Request =>
    ({
        body: undefined,
        params: {},
        query: {},
        user: {
            activeOrganizationId: 'org-1',
            activeWorkspaceId: 'ws-1'
        },
        ...overrides
    } as unknown as Request)

const makeRes = () => {
    const res = { json: jest.fn() } as unknown as Response
    return res
}

const makeNext = (): NextFunction => jest.fn()

describe('customMcpServersController', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('createCustomMcpServer', () => {
        it('should return error when body is not provided', async () => {
            const req = makeReq({ body: undefined })
            const next = makeNext()

            await customMcpServersController.createCustomMcpServer(req, makeRes(), next)

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: StatusCodes.PRECONDITION_FAILED
                })
            )
        })

        it('should return error when organization is not found', async () => {
            const req = makeReq({
                body: { name: 'test' },
                user: { activeOrganizationId: undefined, activeWorkspaceId: 'ws-1' } as any
            })
            const next = makeNext()

            await customMcpServersController.createCustomMcpServer(req, makeRes(), next)

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: StatusCodes.NOT_FOUND
                })
            )
        })

        it('should return error when workspace is not found', async () => {
            const req = makeReq({
                body: { name: 'test' },
                user: { activeOrganizationId: 'org-1', activeWorkspaceId: undefined } as any
            })
            const next = makeNext()

            await customMcpServersController.createCustomMcpServer(req, makeRes(), next)

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: StatusCodes.NOT_FOUND
                })
            )
        })

        it('should only pass allowlisted fields to service', async () => {
            const body = {
                name: 'My Server',
                serverUrl: 'https://example.com',
                iconSrc: 'icon.png',
                color: '#fff',
                authType: 'NONE',
                authConfig: { headers: {} },
                id: 'should-be-stripped',
                workspaceId: 'should-be-overridden',
                createdDate: 'should-be-stripped'
            }
            const req = makeReq({ body })
            const res = makeRes()
            mockService.createCustomMcpServer.mockResolvedValue({ id: 'new-1' })

            await customMcpServersController.createCustomMcpServer(req, res, makeNext())

            expect(mockService.createCustomMcpServer).toHaveBeenCalledWith(
                {
                    name: 'My Server',
                    serverUrl: 'https://example.com',
                    iconSrc: 'icon.png',
                    color: '#fff',
                    authType: 'NONE',
                    authConfig: { headers: {} },
                    workspaceId: 'ws-1'
                },
                'org-1'
            )
            expect(res.json).toHaveBeenCalledWith({ id: 'new-1' })
        })

        it('should set workspaceId from authenticated user', async () => {
            const req = makeReq({ body: { name: 'test' } })
            const res = makeRes()
            mockService.createCustomMcpServer.mockResolvedValue({ id: 'new-1' })

            await customMcpServersController.createCustomMcpServer(req, res, makeNext())

            expect(mockService.createCustomMcpServer).toHaveBeenCalledWith(expect.objectContaining({ workspaceId: 'ws-1' }), 'org-1')
        })

        it('should call next on service error', async () => {
            const req = makeReq({ body: { name: 'test' } })
            const next = makeNext()
            const error = new Error('db failure')
            mockService.createCustomMcpServer.mockRejectedValue(error)

            await customMcpServersController.createCustomMcpServer(req, makeRes(), next)

            expect(next).toHaveBeenCalledWith(error)
        })
    })

    describe('getAllCustomMcpServers', () => {
        it('should pass workspace and pagination params to service', async () => {
            const req = makeReq()
            const res = makeRes()
            mockGetPageAndLimitParams.mockReturnValue({ page: 2, limit: 10 })
            mockService.getAllCustomMcpServers.mockResolvedValue({ data: [], total: 0 })

            await customMcpServersController.getAllCustomMcpServers(req, res, makeNext())

            expect(mockService.getAllCustomMcpServers).toHaveBeenCalledWith('ws-1', 2, 10)
            expect(res.json).toHaveBeenCalledWith({ data: [], total: 0 })
        })

        it('should substitute defaults when pagination is absent (-1/-1)', async () => {
            const req = makeReq()
            mockGetPageAndLimitParams.mockReturnValue({ page: -1, limit: -1 })
            mockService.getAllCustomMcpServers.mockResolvedValue({ data: [], total: 0 })

            await customMcpServersController.getAllCustomMcpServers(req, makeRes(), makeNext())

            expect(mockService.getAllCustomMcpServers).toHaveBeenCalledWith('ws-1', 1, 50)
        })

        it('should clamp oversized limit to the ceiling', async () => {
            const req = makeReq()
            mockGetPageAndLimitParams.mockReturnValue({ page: 1, limit: 100000 })
            mockService.getAllCustomMcpServers.mockResolvedValue({ data: [], total: 0 })

            await customMcpServersController.getAllCustomMcpServers(req, makeRes(), makeNext())

            expect(mockService.getAllCustomMcpServers).toHaveBeenCalledWith('ws-1', 1, 500)
        })

        it('should call next on service error', async () => {
            const req = makeReq()
            const next = makeNext()
            mockGetPageAndLimitParams.mockReturnValue({ page: 1, limit: 10 })
            mockService.getAllCustomMcpServers.mockRejectedValue(new Error('fail'))

            await customMcpServersController.getAllCustomMcpServers(req, makeRes(), next)

            expect(next).toHaveBeenCalledWith(expect.any(Error))
        })
    })

    describe('authType enum validation', () => {
        it('rejects create with an unknown authType', async () => {
            const req = makeReq({ body: { name: 'T', serverUrl: 'https://x.com', authType: 'HAXX' } })
            const next = makeNext()
            await customMcpServersController.createCustomMcpServer(req, makeRes(), next)
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: StatusCodes.BAD_REQUEST }))
            expect(mockService.createCustomMcpServer).not.toHaveBeenCalled()
        })

        it('rejects update with an unknown authType', async () => {
            const req = makeReq({ params: { id: 'mcp-1' } as any, body: { authType: 'HAXX' } })
            const next = makeNext()
            await customMcpServersController.updateCustomMcpServer(req, makeRes(), next)
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: StatusCodes.BAD_REQUEST }))
            expect(mockService.updateCustomMcpServer).not.toHaveBeenCalled()
        })

        it('accepts create with a valid authType (NONE)', async () => {
            const req = makeReq({ body: { name: 'T', serverUrl: 'https://x.com', authType: 'NONE' } })
            mockService.createCustomMcpServer.mockResolvedValue({} as any)
            await customMcpServersController.createCustomMcpServer(req, makeRes(), makeNext())
            expect(mockService.createCustomMcpServer).toHaveBeenCalled()
        })
    })

    describe('getCustomMcpServerById', () => {
        it('should return error when id is not provided', async () => {
            const req = makeReq({ params: {} as any })
            const next = makeNext()

            await customMcpServersController.getCustomMcpServerById(req, makeRes(), next)

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: StatusCodes.PRECONDITION_FAILED
                })
            )
        })

        it('should return error when workspace is not found', async () => {
            const req = makeReq({
                params: { id: 'mcp-1' } as any,
                user: { activeWorkspaceId: undefined } as any
            })
            const next = makeNext()

            await customMcpServersController.getCustomMcpServerById(req, makeRes(), next)

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: StatusCodes.NOT_FOUND
                })
            )
        })

        it('should call service with id and workspaceId', async () => {
            const req = makeReq({ params: { id: 'mcp-1' } as any })
            const res = makeRes()
            const mockResponse = { id: 'mcp-1', name: 'Test' }
            mockService.getCustomMcpServerById.mockResolvedValue(mockResponse as any)

            await customMcpServersController.getCustomMcpServerById(req, res, makeNext())

            expect(mockService.getCustomMcpServerById).toHaveBeenCalledWith('mcp-1', 'ws-1')
            expect(res.json).toHaveBeenCalledWith(mockResponse)
        })
    })

    describe('updateCustomMcpServer', () => {
        it('should return error when id is not provided', async () => {
            const req = makeReq({ params: {} as any, body: { name: 'updated' } })
            const next = makeNext()

            await customMcpServersController.updateCustomMcpServer(req, makeRes(), next)

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: StatusCodes.PRECONDITION_FAILED
                })
            )
        })

        it('should return error when body is not provided', async () => {
            const req = makeReq({ params: { id: 'mcp-1' } as any, body: undefined })
            const next = makeNext()

            await customMcpServersController.updateCustomMcpServer(req, makeRes(), next)

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: StatusCodes.PRECONDITION_FAILED
                })
            )
        })

        it('should return error when workspace is not found', async () => {
            const req = makeReq({
                params: { id: 'mcp-1' } as any,
                body: { name: 'updated' },
                user: { activeWorkspaceId: undefined } as any
            })
            const next = makeNext()

            await customMcpServersController.updateCustomMcpServer(req, makeRes(), next)

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: StatusCodes.NOT_FOUND
                })
            )
        })

        it('should only pass allowlisted fields to service', async () => {
            const body = {
                name: 'Updated',
                serverUrl: 'https://new-url.com',
                iconSrc: 'new-icon.png',
                color: '#000',
                authType: 'CUSTOM_HEADERS',
                authConfig: { headers: { 'X-Key': 'val' } },
                id: 'should-be-stripped',
                workspaceId: 'should-be-stripped',
                status: 'should-be-stripped'
            }
            const req = makeReq({ params: { id: 'mcp-1' } as any, body })
            const res = makeRes()
            mockService.updateCustomMcpServer.mockResolvedValue({ id: 'mcp-1' })

            await customMcpServersController.updateCustomMcpServer(req, res, makeNext())

            expect(mockService.updateCustomMcpServer).toHaveBeenCalledWith(
                'mcp-1',
                {
                    name: 'Updated',
                    serverUrl: 'https://new-url.com',
                    iconSrc: 'new-icon.png',
                    color: '#000',
                    authType: 'CUSTOM_HEADERS',
                    authConfig: { headers: { 'X-Key': 'val' } }
                },
                'ws-1'
            )
            expect(res.json).toHaveBeenCalledWith({ id: 'mcp-1' })
        })
    })

    describe('deleteCustomMcpServer', () => {
        it('should return error when id is not provided', async () => {
            const req = makeReq({ params: {} as any })
            const next = makeNext()

            await customMcpServersController.deleteCustomMcpServer(req, makeRes(), next)

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: StatusCodes.PRECONDITION_FAILED
                })
            )
        })

        it('should return error when workspace is not found', async () => {
            const req = makeReq({
                params: { id: 'mcp-1' } as any,
                user: { activeWorkspaceId: undefined } as any
            })
            const next = makeNext()

            await customMcpServersController.deleteCustomMcpServer(req, makeRes(), next)

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: StatusCodes.NOT_FOUND
                })
            )
        })

        it('should call service with id and workspaceId', async () => {
            const req = makeReq({ params: { id: 'mcp-1' } as any })
            const res = makeRes()
            mockService.deleteCustomMcpServer.mockResolvedValue({ affected: 1 })

            await customMcpServersController.deleteCustomMcpServer(req, res, makeNext())

            expect(mockService.deleteCustomMcpServer).toHaveBeenCalledWith('mcp-1', 'ws-1')
            expect(res.json).toHaveBeenCalledWith({ affected: 1 })
        })
    })

    describe('authorizeCustomMcpServer', () => {
        it('should return error when id is not provided', async () => {
            const req = makeReq({ params: {} as any })
            const next = makeNext()

            await customMcpServersController.authorizeCustomMcpServer(req, makeRes(), next)

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: StatusCodes.PRECONDITION_FAILED
                })
            )
        })

        it('should return error when workspace is not found', async () => {
            const req = makeReq({
                params: { id: 'mcp-1' } as any,
                user: { activeWorkspaceId: undefined } as any
            })
            const next = makeNext()

            await customMcpServersController.authorizeCustomMcpServer(req, makeRes(), next)

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: StatusCodes.NOT_FOUND
                })
            )
        })

        it('should call service with id and workspaceId', async () => {
            const req = makeReq({ params: { id: 'mcp-1' } as any })
            const res = makeRes()
            mockService.authorizeCustomMcpServer.mockResolvedValue({ id: 'mcp-1', status: 'AUTHORIZED' })

            await customMcpServersController.authorizeCustomMcpServer(req, res, makeNext())

            expect(mockService.authorizeCustomMcpServer).toHaveBeenCalledWith('mcp-1', 'ws-1')
            expect(res.json).toHaveBeenCalledWith({ id: 'mcp-1', status: 'AUTHORIZED' })
        })

        it('should call next on service error', async () => {
            const req = makeReq({ params: { id: 'mcp-1' } as any })
            const next = makeNext()
            mockService.authorizeCustomMcpServer.mockRejectedValue(new Error('connection failed'))

            await customMcpServersController.authorizeCustomMcpServer(req, makeRes(), next)

            expect(next).toHaveBeenCalledWith(expect.any(Error))
        })
    })

    describe('getDiscoveredTools', () => {
        it('should return error when id is not provided', async () => {
            const req = makeReq({ params: {} as any })
            const next = makeNext()

            await customMcpServersController.getDiscoveredTools(req, makeRes(), next)

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: StatusCodes.PRECONDITION_FAILED
                })
            )
        })

        it('should return error when workspace is not found', async () => {
            const req = makeReq({
                params: { id: 'mcp-1' } as any,
                user: { activeWorkspaceId: undefined } as any
            })
            const next = makeNext()

            await customMcpServersController.getDiscoveredTools(req, makeRes(), next)

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: StatusCodes.NOT_FOUND
                })
            )
        })

        it('should call service with id and workspaceId', async () => {
            const req = makeReq({ params: { id: 'mcp-1' } as any })
            const res = makeRes()
            const tools = [
                { name: 'tool1', description: 'description1', inputSchema: null },
                { name: 'tool2', description: 'description2', inputSchema: null }
            ]
            mockService.getDiscoveredTools.mockResolvedValue(tools)

            await customMcpServersController.getDiscoveredTools(req, res, makeNext())

            expect(mockService.getDiscoveredTools).toHaveBeenCalledWith('mcp-1', 'ws-1')
            expect(res.json).toHaveBeenCalledWith(tools)
        })
    })
})
