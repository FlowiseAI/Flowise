import { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { VectorStore } from '@langchain/core/vectorstores'
import { Document } from '@langchain/core/documents'
import { PromptTemplate } from '@langchain/core/prompts'
import { LLMChain } from 'langchain/chains'

class TaskCreationChain extends LLMChain {
    constructor(prompt: PromptTemplate, llm: BaseChatModel) {
        super({ prompt, llm })
    }

    static from_llm(llm: BaseChatModel): LLMChain {
        const taskCreationTemplate: string =
            'You are a task creation AI that uses the result of an execution agent' +
            ' to create new tasks with the following objective: {objective},' +
            ' The last completed task has the result: {result}.' +
            ' This result was based on this task description: {task_description}.' +
            ' These are incomplete tasks list: {incomplete_tasks}.' +
            ' Based on the result, create new tasks to be completed' +
            ' by the AI system that do not overlap with incomplete tasks.' +
            ' Return the tasks as an array.'

        const prompt = new PromptTemplate({
            template: taskCreationTemplate,
            inputVariables: ['result', 'task_description', 'incomplete_tasks', 'objective']
        })

        return new TaskCreationChain(prompt, llm)
    }
}

class TaskPrioritizationChain extends LLMChain {
    constructor(prompt: PromptTemplate, llm: BaseChatModel) {
        super({ prompt, llm })
    }

    static from_llm(llm: BaseChatModel): TaskPrioritizationChain {
        const taskPrioritizationTemplate: string =
            'You are a task prioritization AI tasked with cleaning the formatting of and reprioritizing' +
            ' the following task list: {task_names}.' +
            ' Consider the ultimate objective of your team: {objective}.' +
            ' Do not remove any tasks. Return the result as a numbered list, like:' +
            ' #. First task' +
            ' #. Second task' +
            ' Start the task list with number {next_task_id}.'
        const prompt = new PromptTemplate({
            template: taskPrioritizationTemplate,
            inputVariables: ['task_names', 'next_task_id', 'objective']
        })
        return new TaskPrioritizationChain(prompt, llm)
    }
}

class ExecutionChain extends LLMChain {
    constructor(prompt: PromptTemplate, llm: BaseChatModel) {
        super({ prompt, llm })
    }

    static from_llm(llm: BaseChatModel): LLMChain {
        const executionTemplate: string =
            'You are an AI who performs one task based on the following objective: {objective}.' +
            ' Take into account these previously completed tasks: {context}.' +
            ' Your task: {task}.' +
            ' Response:'

        const prompt = new PromptTemplate({
            template: executionTemplate,
            inputVariables: ['objective', 'context', 'task']
        })

        return new ExecutionChain(prompt, llm)
    }
}

async function getNextTask(
    taskCreationChain: LLMChain,
    result: string,
    taskDescription: string,
    taskList: string[],
    objective: string
): Promise<any[]> {
    const incompleteTasks: string = taskList.join(', ')
    const response: string = await taskCreationChain.predict({
        result,
        task_description: taskDescription,
        incomplete_tasks: incompleteTasks,
        objective
    })

    const newTasks: string[] = response.split('\n')

    return newTasks.filter((taskName) => taskName.trim()).map((taskName) => ({ task_name: taskName }))
}

interface Task {
    task_id: number
    task_name: string
}

async function prioritizeTasks(
    taskPrioritizationChain: LLMChain,
    thisTaskId: number,
    taskList: Task[],
    objective: string
): Promise<Task[]> {
    const next_task_id = thisTaskId + 1
    const task_names = taskList.map((t) => t.task_name).join(', ')
    const response = await taskPrioritizationChain.predict({ task_names, next_task_id, objective })
    const newTasks = response.split('\n')
    const prioritizedTaskList: Task[] = []

    for (const taskString of newTasks) {
        if (!taskString.trim()) {
            // eslint-disable-next-line no-continue
            continue
        }
        const taskParts = taskString.trim().split('. ', 2)
        if (taskParts.length === 2) {
            const task_id = parseInt(taskParts[0].trim(), 10)
            const task_name = taskParts[1].trim()
            prioritizedTaskList.push({ task_id, task_name })
        }
    }

    return prioritizedTaskList
}

export async function get_top_tasks(vectorStore: VectorStore, query: string, k: number): Promise<string[]> {
    const docs = await vectorStore.similaritySearch(query, k)
    let returnDocs: string[] = []
    for (const doc of docs) {
        returnDocs.push(doc.metadata.task)
    }
    return returnDocs
}

async function executeTask(vectorStore: VectorStore, executionChain: LLMChain, objective: string, task: string, k = 5): Promise<string> {
    const context = await get_top_tasks(vectorStore, objective, k)
    return executionChain.predict({ objective, context, task })
}

export class BabyAGI {
    taskList: Array<Task> = []

    taskCreationChain: TaskCreationChain

    taskPrioritizationChain: TaskPrioritizationChain

    executionChain: ExecutionChain

    taskIdCounter = 1

    vectorStore: VectorStore

    maxIterations = 3

    topK = 4

    constructor(
        taskCreationChain: TaskCreationChain,
        taskPrioritizationChain: TaskPrioritizationChain,
        executionChain: ExecutionChain,
        vectorStore: VectorStore,
        maxIterations: number,
        topK: number
    ) {
        this.taskCreationChain = taskCreationChain
        this.taskPrioritizationChain = taskPrioritizationChain
        this.executionChain = executionChain
        this.vectorStore = vectorStore
        this.maxIterations = maxIterations
        this.topK = topK
    }

    addTask(task: Task) {
        this.taskList.push(task)
    }

    printTaskList() {
        // eslint-disable-next-line no-console
        console.log('\x1b[95m\x1b[1m\n*****TASK LIST*****\n\x1b[0m\x1b[0m')
        // eslint-disable-next-line no-console
        this.taskList.forEach((t) => console.log(`${t.task_id}: ${t.task_name}`))
    }

    printNextTask(task: Task) {
        // eslint-disable-next-line no-console
        console.log('\x1b[92m\x1b[1m\n*****NEXT TASK*****\n\x1b[0m\x1b[0m')
        // eslint-disable-next-line no-console
        console.log(`${task.task_id}: ${task.task_name}`)
    }

    printTaskResult(result: string) {
        // eslint-disable-next-line no-console
        console.log('\x1b[93m\x1b[1m\n*****TASK RESULT*****\n\x1b[0m\x1b[0m')
        // eslint-disable-next-line no-console
        console.log(result)
    }

    getInputKeys(): string[] {
        return ['objective']
    }

    getOutputKeys(): string[] {
        return []
    }

    async call(inputs: Record<string, any>): Promise<string> {
        const { objective } = inputs
        const firstTask = inputs.first_task || 'Make a todo list'
        this.addTask({ task_id: 1, task_name: firstTask })
        let numIters = 0
        let loop = true
        let finalResult = ''

        while (loop) {
            if (this.taskList.length) {
                this.printTaskList()

                // Step 1: Pull the first task
                const task = this.taskList.shift()
                if (!task) break
                this.printNextTask(task)

                // Step 2: Execute the task
                const result = await executeTask(this.vectorStore, this.executionChain, objective, task.task_name, this.topK)
                const thisTaskId = task.task_id
                finalResult = result
                this.printTaskResult(result)

                // Step 3: Store the result in Pinecone
                const docs = new Document({ pageContent: result, metadata: { task: task.task_name } })
                this.vectorStore.addDocuments([docs])

                // Step 4: Create new tasks and reprioritize task list
                const newTasks = await getNextTask(
                    this.taskCreationChain,
                    result,
                    task.task_name,
                    this.taskList.map((t) => t.task_name),
                    objective
                )
                newTasks.forEach((newTask) => {
                    this.taskIdCounter += 1
                    // eslint-disable-next-line no-param-reassign
                    newTask.task_id = this.taskIdCounter
                    this.addTask(newTask)
                })
                this.taskList = await prioritizeTasks(this.taskPrioritizationChain, thisTaskId, this.taskList, objective)
            }

            numIters += 1
            if (this.maxIterations !== null && numIters === this.maxIterations) {
                // eslint-disable-next-line no-console
                console.log('\x1b[91m\x1b[1m\n*****TASK ENDING*****\n\x1b[0m\x1b[0m')
                loop = false
                this.taskList = []
            }
        }

        return finalResult
    }

    static fromLLM(llm: BaseChatModel, vectorstore: VectorStore, maxIterations = 3, topK = 4): BabyAGI {
        const taskCreationChain = TaskCreationChain.from_llm(llm)
        const taskPrioritizationChain = TaskPrioritizationChain.from_llm(llm)
        const executionChain = ExecutionChain.from_llm(llm)
        return new BabyAGI(taskCreationChain, taskPrioritizationChain, executionChain, vectorstore, maxIterations, topK)
    }
}
