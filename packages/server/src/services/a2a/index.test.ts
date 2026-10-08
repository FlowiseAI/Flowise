import express from 'express'
import request from 'supertest'

const mockFindChatflow = jest.fn()
const mockBuildChatflow = jest.fn()
jest.mock('../../utils/getRunningExpressApp', () => ({
    getRunningExpressApp: () => ({ AppDataSource: { getRepository: () => ({ findOneBy: mockFindChatflow }) } })
}))
jest.mock('../../utils/buildChatflow', () => ({ utilBuildChatflow: (...args: any[]) => mockBuildChatflow(...args) }))
jest.mock('../../utils/logger', () => ({ __esModule: true, default: { error: jest.fn() } }))

import service from './index'

const chatflowId = '102c1fd7-a77c-47d0-9daf-4618b70c0182'
const app = express()
app.use(express.json())
app.post('/:chatflowId', (req, res) => service.handleJsonRpc(req.params.chatflowId, req, res))
const send = () => ({ jsonrpc: '2.0', id: 1, method: 'tasks/send', params: { message: { parts: [{ kind: 'text', text: 'hello' }] } } })

describe('A2A task retention', () => {
    beforeEach(() => {
        jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] })
        service.activeTasks.clear()
        mockFindChatflow.mockReset().mockResolvedValue({ id: chatflowId, name: 'Example' })
        mockBuildChatflow.mockReset()
    })

    afterEach(() => {
        jest.clearAllTimers()
        jest.useRealTimers()
        service.activeTasks.clear()
    })

    it('expires completed tasks after retaining their result for one hour', async () => {
        mockBuildChatflow.mockResolvedValue({ text: 'result' })
        const response = await request(app).post(`/${chatflowId}`).send(send())
        expect(response.body.result.status.state).toBe('completed')
        const id = response.body.result.id
        jest.advanceTimersByTime(60 * 60 * 1000 - 1)
        expect(service.activeTasks.get(id)?.status.state).toBe('completed')
        jest.advanceTimersByTime(1)
        expect(service.activeTasks.has(id)).toBe(false)
    })

    it('expires failed tasks even when the server generated the task id', async () => {
        mockBuildChatflow.mockRejectedValue(new Error('generation failed'))
        const response = await request(app).post(`/${chatflowId}`).send(send())
        expect(response.body.error.message).toBe('Task execution failed')
        expect([...service.activeTasks.values()].map((task) => task.status.state)).toEqual(['failed'])
        jest.advanceTimersByTime(60 * 60 * 1000)
        expect(service.activeTasks.size).toBe(0)
    })

    it('rejects invalid identifiers before querying the database', async () => {
        const response = await request(app).post('/invalid').send(send())
        expect(response.status).toBe(400)
        expect(mockFindChatflow).not.toHaveBeenCalled()
    })
})
