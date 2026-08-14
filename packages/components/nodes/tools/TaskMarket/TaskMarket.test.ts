import axios from 'axios'
import { createTaskMarketTools, TaskMarketBrowseTool, TaskMarketGetTool, TaskMarketTrackTool } from './TaskMarket'

jest.mock('axios')

const mockedAxios = axios as jest.Mocked<typeof axios>
const taskId = `0x${'a'.repeat(64)}`

describe('TaskMarket tools', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockedAxios.isAxiosError.mockImplementation((error: any) => error?.isAxiosError === true)
    })

    it('creates exactly the three read-only discovery tools', () => {
        const tools = createTaskMarketTools()
        expect(tools.map((tool) => tool.name)).toEqual(['taskmarket_browse_tasks', 'taskmarket_get_task', 'taskmarket_track_task'])
        expect(tools.every((tool) => tool.method === 'GET')).toBe(true)
        expect(tools.map((tool) => tool.name).join(' ')).not.toMatch(/create|pay|wallet|submit/)
    })

    it('browses with bounded filters against the fixed public API', async () => {
        mockedAxios.get.mockResolvedValueOnce({ data: { tasks: [{ id: taskId }], hasMore: false, nextCursor: null } } as any)
        const tool = new TaskMarketBrowseTool({ timeoutMs: 5000, defaultLimit: 12 })

        const result = JSON.parse(await tool._call({ status: 'open', mode: 'bounty', tags: ['code', 'agents'], sort: 'reward_desc' }))

        expect(result).toEqual({ ok: true, data: { tasks: [{ id: taskId }], hasMore: false, nextCursor: null } })
        expect(mockedAxios.get).toHaveBeenCalledTimes(1)
        const [url, config] = mockedAxios.get.mock.calls[0]
        expect(url).toBe('https://api.taskmarket.dev/api/tasks')
        expect(config?.timeout).toBe(5000)
        expect(config?.maxContentLength).toBe(1_048_576)
        expect((config?.params as URLSearchParams).toString()).toBe('status=open&limit=12&mode=bounty&sort=reward_desc&tags=code%2Cagents')
    })

    it('rejects an out-of-range browse limit before making a request', async () => {
        const tool = new TaskMarketBrowseTool()
        await expect(tool._call({ limit: 101 })).rejects.toThrow('limit must be an integer between 1 and 100')
        expect(mockedAxios.get).not.toHaveBeenCalled()
    })

    it('gets a task only after validating its ID', async () => {
        mockedAxios.get.mockResolvedValueOnce({ data: { id: taskId, status: 'open' } } as any)
        const tool = new TaskMarketGetTool()

        expect(JSON.parse(await tool._call({ taskId }))).toEqual({ ok: true, data: { id: taskId, status: 'open' } })
        expect(mockedAxios.get).toHaveBeenCalledWith(
            `https://api.taskmarket.dev/api/tasks/${taskId}`,
            expect.objectContaining({ timeout: 10_000, headers: { Accept: 'application/json' } })
        )
    })

    it('rejects malformed task IDs without making a request', async () => {
        const tool = new TaskMarketGetTool()
        await expect(tool._call({ taskId: '../../wallet' })).rejects.toThrow('0x-prefixed 32-byte hexadecimal')
        expect(mockedAxios.get).not.toHaveBeenCalled()
    })

    it('tracks task details and visible submissions concurrently', async () => {
        mockedAxios.get
            .mockResolvedValueOnce({ data: { id: taskId, status: 'open' } } as any)
            .mockResolvedValueOnce({ data: [{ id: 'submission-1' }, { id: 'submission-2' }] } as any)
        const tool = new TaskMarketTrackTool({ timeoutMs: 8000 })

        const result = JSON.parse(await tool._call({ taskId }))

        expect(result).toEqual({
            ok: true,
            data: {
                task: { id: taskId, status: 'open' },
                submissions: [{ id: 'submission-1' }, { id: 'submission-2' }],
                submissionCount: 2
            }
        })
        expect(mockedAxios.get.mock.calls.map(([url]) => url)).toEqual([
            `https://api.taskmarket.dev/api/tasks/${taskId}`,
            `https://api.taskmarket.dev/api/tasks/${taskId}/submissions`
        ])
    })

    it('returns a clear timeout error without exposing request internals', async () => {
        mockedAxios.get.mockRejectedValueOnce({ isAxiosError: true, code: 'ECONNABORTED', message: 'timeout of 10000ms exceeded' })
        const tool = new TaskMarketGetTool()
        await expect(tool._call({ taskId })).rejects.toThrow('TaskMarket API request timed out')
    })

    it('returns a clear HTTP status error', async () => {
        mockedAxios.get.mockRejectedValueOnce({ isAxiosError: true, message: 'bad response', response: { status: 503 } })
        const tool = new TaskMarketGetTool()
        await expect(tool._call({ taskId })).rejects.toThrow('TaskMarket API request failed with status 503')
    })
})
