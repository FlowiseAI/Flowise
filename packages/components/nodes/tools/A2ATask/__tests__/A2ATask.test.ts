import fs from 'fs'
import os from 'os'
import path from 'path'
import { LocalJsonAdapter } from '../../A2AStorage/adapters/LocalJsonAdapter'
import type { A2AStorageAdapter } from '../../../../src/A2AStorageAdapter'
import { TaskCreateTool, TaskGetTool, TaskStatusTool, TaskListTool, MessageSendTool, MessageGetTool } from '../core'

const AGENT_A_ID = '550e8400-e29b-41d4-a716-446655440000'
const AGENT_B_ID = '123e4567-e89b-12d3-a456-426614174000'

describe('A2ATask Node', () => {
    let adapter: A2AStorageAdapter
    let dataDir: string

    beforeEach(async () => {
        dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'a2a-task-test-'))
        adapter = new LocalJsonAdapter({ dataDir })
        await adapter.initialize({})
    })

    afterEach(() => {
        fs.rmSync(dataDir, { recursive: true, force: true })
    })

    describe('TaskCreateTool', () => {
        it('should create a task and return a UUID', async () => {
            const tool = new TaskCreateTool(adapter)
            const id = await tool._call({
                title: 'Analyze policy impact',
                description: 'Review the proposed policy changes',
                requesterId: AGENT_A_ID,
                assigneeId: AGENT_B_ID
            })
            expect(typeof id).toBe('string')
            expect(id.length).toBeGreaterThan(0)
        })

        it('should set status to submitted by default', async () => {
            const tool = new TaskCreateTool(adapter)
            const id = await tool._call({
                title: 'Test task',
                description: '',
                requesterId: AGENT_A_ID
            })
            const task = await adapter.getTask(id)
            expect(task).not.toBeNull()
            expect(task!.status).toBe('submitted')
        })
    })

    describe('TaskGetTool', () => {
        it('should retrieve a created task', async () => {
            const createTool = new TaskCreateTool(adapter)
            const id = await createTool._call({
                title: 'Review document',
                description: 'Check for accuracy',
                requesterId: AGENT_A_ID
            })

            const getTool = new TaskGetTool(adapter)
            const task = await getTool._call({ taskId: id })
            expect(task).not.toBeNull()
            expect(task!.title).toBe('Review document')
            expect(task!.requesterId).toBe(AGENT_A_ID)
        })

        it('should return null for unknown task id', async () => {
            const tool = new TaskGetTool(adapter)
            const task = await tool._call({ taskId: '00000000-0000-0000-0000-000000000000' })
            expect(task).toBeNull()
        })
    })

    describe('TaskStatusTool', () => {
        it('should transition submitted → working', async () => {
            const createTool = new TaskCreateTool(adapter)
            const id = await createTool._call({
                title: 'T1',
                description: '',
                requesterId: AGENT_A_ID
            })

            const statusTool = new TaskStatusTool(adapter)
            await statusTool._call({ taskId: id, status: 'working' })

            const task = await adapter.getTask(id)
            expect(task!.status).toBe('working')
        })

        it('should transition working → completed', async () => {
            const createTool = new TaskCreateTool(adapter)
            const id = await createTool._call({
                title: 'T2',
                description: '',
                requesterId: AGENT_A_ID
            })
            const statusTool = new TaskStatusTool(adapter)
            await statusTool._call({ taskId: id, status: 'working' })
            await statusTool._call({ taskId: id, status: 'completed' })

            const task = await adapter.getTask(id)
            expect(task!.status).toBe('completed')
        })

        it('should transition working → failed', async () => {
            const createTool = new TaskCreateTool(adapter)
            const id = await createTool._call({
                title: 'T3',
                description: '',
                requesterId: AGENT_A_ID
            })
            const statusTool = new TaskStatusTool(adapter)
            await statusTool._call({ taskId: id, status: 'working' })
            await statusTool._call({ taskId: id, status: 'failed' })

            const task = await adapter.getTask(id)
            expect(task!.status).toBe('failed')
        })

        it('should transition submitted → canceled', async () => {
            const createTool = new TaskCreateTool(adapter)
            const id = await createTool._call({
                title: 'T4',
                description: '',
                requesterId: AGENT_A_ID
            })
            const statusTool = new TaskStatusTool(adapter)
            await statusTool._call({ taskId: id, status: 'canceled' })

            const task = await adapter.getTask(id)
            expect(task!.status).toBe('canceled')
        })

        it('should reject completed → working', async () => {
            const createTool = new TaskCreateTool(adapter)
            const id = await createTool._call({
                title: 'T5',
                description: '',
                requesterId: AGENT_A_ID
            })
            const statusTool = new TaskStatusTool(adapter)
            await statusTool._call({ taskId: id, status: 'working' })
            await statusTool._call({ taskId: id, status: 'completed' })

            await expect(statusTool._call({ taskId: id, status: 'working' })).rejects.toThrow(/Invalid.*transition.*completed → working/)
        })

        it('should reject failed → working', async () => {
            const createTool = new TaskCreateTool(adapter)
            const id = await createTool._call({
                title: 'T6',
                description: '',
                requesterId: AGENT_A_ID
            })
            const statusTool = new TaskStatusTool(adapter)
            await statusTool._call({ taskId: id, status: 'working' })
            await statusTool._call({ taskId: id, status: 'failed' })

            await expect(statusTool._call({ taskId: id, status: 'working' })).rejects.toThrow(/Invalid.*transition.*failed → working/)
        })

        it('should throw for non-existent task', async () => {
            const tool = new TaskStatusTool(adapter)
            await expect(tool._call({ taskId: '00000000-0000-0000-0000-000000000000', status: 'working' })).rejects.toThrow(
                /Task.*not found/
            )
        })
    })

    describe('TaskListTool', () => {
        it('should list all tasks', async () => {
            const createTool = new TaskCreateTool(adapter)
            await createTool._call({ title: 'T1', description: '', requesterId: AGENT_A_ID })
            await createTool._call({ title: 'T2', description: '', requesterId: AGENT_B_ID })

            const listTool = new TaskListTool(adapter)
            const tasks = await listTool._call({})
            expect(tasks).toHaveLength(2)
        })

        it('should filter tasks by status', async () => {
            const createTool = new TaskCreateTool(adapter)
            const id = await createTool._call({
                title: 'Working task',
                description: '',
                requesterId: AGENT_A_ID
            })
            const statusTool = new TaskStatusTool(adapter)
            await statusTool._call({ taskId: id, status: 'working' })
            // Create another that stays submitted
            await createTool._call({ title: 'Submitted task', description: '', requesterId: AGENT_B_ID })

            const listTool = new TaskListTool(adapter)
            const working = await listTool._call({ status: 'working' })
            expect(working).toHaveLength(1)
            expect(working[0].title).toBe('Working task')
        })
    })

    describe('MessageSendTool', () => {
        it('should send a message and return a UUID', async () => {
            const createTool = new TaskCreateTool(adapter)
            const taskId = await createTool._call({
                title: 'T',
                description: '',
                requesterId: AGENT_A_ID
            })

            const msgTool = new MessageSendTool(adapter)
            const msgId = await msgTool._call({
                taskId,
                senderId: AGENT_A_ID,
                content: 'Please review this document',
                role: 'query'
            })
            expect(typeof msgId).toBe('string')
            expect(msgId.length).toBeGreaterThan(0)
        })
    })

    describe('MessageGetTool', () => {
        it('should retrieve messages for a task', async () => {
            const createTool = new TaskCreateTool(adapter)
            const taskId = await createTool._call({
                title: 'T',
                description: '',
                requesterId: AGENT_A_ID
            })

            const msgTool = new MessageSendTool(adapter)
            await msgTool._call({ taskId, senderId: AGENT_A_ID, content: 'First', role: 'instruction' })
            await msgTool._call({ taskId, senderId: AGENT_B_ID, content: 'Second', role: 'response' })

            const getTool = new MessageGetTool(adapter)
            const messages = await getTool._call({ taskId })
            expect(messages).toHaveLength(2)
            expect(messages[0].content).toBe('First')
            expect(messages[1].content).toBe('Second')
        })

        it('should return empty array for task with no messages', async () => {
            const createTool = new TaskCreateTool(adapter)
            const taskId = await createTool._call({
                title: 'Empty',
                description: '',
                requesterId: AGENT_A_ID
            })

            const getTool = new MessageGetTool(adapter)
            const messages = await getTool._call({ taskId })
            expect(messages).toEqual([])
        })
    })
})
