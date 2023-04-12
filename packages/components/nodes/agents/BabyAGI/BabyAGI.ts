import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { Configuration, CreateChatCompletionRequest, CreateCompletionRequest, OpenAIApi } from 'openai'
import { PineconeClient } from '@pinecone-database/pinecone'
import { CreateIndexRequest } from '@pinecone-database/pinecone/dist/pinecone-generated-ts-fetch'
import { VectorOperationsApi } from '@pinecone-database/pinecone/dist/pinecone-generated-ts-fetch'
import { v4 as uuidv4 } from 'uuid'

interface Task {
    id: string
    name: string
    priority: number // 1 is highest priority
}

class BabyAGI_Agents implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'BabyAGI'
        this.name = 'babyAGI'
        this.type = 'BabyAGI'
        this.category = 'Agents'
        this.icon = 'babyagi.svg'
        this.description = 'Task Driven Autonomous Agent which creates new task and reprioritizes task list based on objective'
        this.inputs = [
            {
                label: 'Task Loop',
                name: 'taskLoop',
                type: 'number',
                default: 3
            },
            {
                label: 'OpenAI Api Key',
                name: 'openAIApiKey',
                type: 'password'
            },
            {
                label: 'Pinecone Api Key',
                name: 'pineconeApiKey',
                type: 'password'
            },
            {
                label: 'Pinecone Environment',
                name: 'pineconeEnv',
                type: 'string'
            },
            {
                label: 'Pinecone Index',
                name: 'pineconeIndex',
                type: 'string'
            },
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'options',
                options: [
                    {
                        label: 'gpt-4',
                        name: 'gpt-4'
                    },
                    {
                        label: 'gpt-4-0314',
                        name: 'gpt-4-0314'
                    },
                    {
                        label: 'gpt-4-32k-0314',
                        name: 'gpt-4-32k-0314'
                    },
                    {
                        label: 'gpt-3.5-turbo',
                        name: 'gpt-3.5-turbo'
                    },
                    {
                        label: 'gpt-3.5-turbo-0301',
                        name: 'gpt-3.5-turbo-0301'
                    }
                ],
                default: 'gpt-3.5-turbo',
                optional: true
            }
        ]
    }

    async getBaseClasses(): Promise<string[]> {
        return ['BabyAGI']
    }

    async init(): Promise<any> {
        return null
    }

    async run(nodeData: INodeData, input: string): Promise<string> {
        const openAIApiKey = nodeData.inputs?.openAIApiKey as string
        const pineconeApiKey = nodeData.inputs?.pineconeApiKey as string
        const pineconeEnv = nodeData.inputs?.pineconeEnv as string
        const index = nodeData.inputs?.pineconeIndex as string
        const modelName = nodeData.inputs?.modelName as string
        const taskLoop = nodeData.inputs?.taskLoop as string
        const objective = input

        const configuration = new Configuration({
            apiKey: openAIApiKey
        })
        const openai = new OpenAIApi(configuration)

        const pinecone = new PineconeClient()
        await pinecone.init({
            apiKey: pineconeApiKey,
            environment: pineconeEnv
        })

        const dimension = 1536
        const metric = 'cosine'
        const podType = 'p1'

        const indexList = await pinecone.listIndexes()
        if (!indexList.includes(index)) {
            const createIndexOptions: CreateIndexRequest = {
                createRequest: {
                    name: index,
                    dimension,
                    metric,
                    podType
                }
            }
            await pinecone.createIndex(createIndexOptions)
        }

        let vectorIndex: VectorOperationsApi = pinecone.Index(index)

        let taskList: Task[] = []
        let embeddingList = new Map<string, number[]>()

        taskList = [
            {
                id: uuidv4(),
                name: 'Develop a task list',
                priority: 1
            }
        ]

        return await mainLoop(openai, pinecone, index, embeddingList, vectorIndex, taskList, objective, modelName, taskLoop)
    }
}

export const getADAEmbedding = async (openai: OpenAIApi, text: string, embeddingList: Map<string, number[]>): Promise<number[]> => {
    //console.log('\nGetting ADA embedding for: ', text)

    if (embeddingList.has(text)) {
        //console.log('Embedding already exists for: ', text)
        const numbers = embeddingList.get(text)
        return numbers ?? []
    }

    const embedding = (
        await openai.createEmbedding({
            input: [text],
            model: 'text-embedding-ada-002'
        })
    ).data?.data[0].embedding

    embeddingList.set(text, embedding)

    return embedding
}

export const openAICall = async (openai: OpenAIApi, prompt: string, gptVersion: string, temperature = 0.5, max_tokens = 100) => {
    if (gptVersion === 'gpt-3.5-turbo' || gptVersion === 'gpt-4' || gptVersion === 'gpt-4-32k') {
        // Chat completion
        const options: CreateChatCompletionRequest = {
            model: gptVersion,
            messages: [{ role: 'user', content: prompt }],
            temperature,
            max_tokens,
            n: 1
        }
        const data = (await openai.createChatCompletion(options)).data

        return data?.choices[0]?.message?.content.trim() ?? ''
    } else {
        // Prompt completion
        const options: CreateCompletionRequest = {
            model: gptVersion,
            prompt,
            temperature,
            max_tokens,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0
        }
        const data = (await openai.createCompletion(options)).data

        return data?.choices[0]?.text?.trim() ?? ''
    }
}

export const taskCreationAgent = async (
    openai: OpenAIApi,
    taskList: Task[],
    objective: string,
    result: string,
    taskDescription: string,
    gptVersion = 'gpt-3.5-turbo'
): Promise<Task[]> => {
    const prompt = `You are an task creation AI that uses the result of an execution agent to create new tasks with the following objective: ${objective}, The last completed task has the result: ${result}. This result was based on this task description: ${taskDescription}. These are incomplete tasks: ${taskList.join(
        ', '
    )}. Based on the result, create new tasks to be completed by the AI system that do not overlap with incomplete tasks. Return the tasks as an array.`
    const response = await openAICall(openai, prompt, gptVersion)
    const newTaskNames = response.split('\n')

    return newTaskNames.map((name) => ({
        id: uuidv4(),
        name,
        priority: taskList.length + 1
    }))
}

export const prioritizationAgent = async (
    openai: OpenAIApi,
    taskList: Task[],
    taskPriority: number,
    objective: string,
    gptVersion = 'gpt-3.5-turbo'
): Promise<Task[]> => {
    const taskNames = taskList.map((t) => t.name)
    const startPriority = taskPriority + 1

    const prompt = `You are an task prioritization AI tasked with cleaning the formatting of and reprioritizing the following tasks: ${taskNames}. Consider the ultimate objective of your team: ${objective}. Do not remove any tasks. Return the result as a list, like:
  #. First task
  #. Second task
  Start the task list with number ${startPriority}.`
    const response = await openAICall(openai, prompt, gptVersion)
    const newTasks = response.split('\n')

    // Parse and add new tasks
    return (
        newTasks
            .map((taskString) => {
                const taskParts = taskString.trim().split('.', 2)

                if (taskParts.length === 2) {
                    const id = uuidv4()
                    const name = taskParts[1].trim()
                    const priority = parseInt(taskParts[0])
                    return {
                        id,
                        name,
                        priority
                    } as Task
                }
            })
            // Remove lines that don't have a task
            .filter((t) => t !== undefined)
            // Sort by priority
            .sort((a, b) => a!.priority - b!.priority) as Task[]
    )
}

export const contextAgent = async (
    openai: OpenAIApi,
    pinecone: PineconeClient,
    indexName: string,
    embeddingList: Map<string, number[]>,
    objective: string,
    topK: number
) => {
    const index = pinecone.Index(indexName)
    const queryEmbedding = await getADAEmbedding(openai, objective, embeddingList)

    const results = await index.query({
        queryRequest: {
            vector: queryEmbedding,
            includeMetadata: true,
            topK
        }
    })
    const sortedResults = results.matches?.sort((a, b) => (b?.score ?? 0) - (a?.score ?? 0)) ?? []

    return sortedResults.map((item) => (item.metadata as any)?.task ?? '')
}

export const executionAgent = async (
    openai: OpenAIApi,
    pinecone: PineconeClient,
    indexName: string,
    embeddingList: Map<string, number[]>,
    objective: string,
    task: Task,
    gptVersion = 'gpt-3.5-turbo'
) => {
    const context = await contextAgent(openai, pinecone, indexName, embeddingList, objective, 5)
    const prompt = `You are an AI who performs one task based on the following objective: ${objective}.\nTake into account these previously completed tasks: ${context}\nYour task: ${task.name}\nResponse:`

    //console.log('\nexecution prompt: ', prompt, '\n')

    return openAICall(openai, prompt, gptVersion, 0.7, 2000)
}

export const mainLoop = async (
    openai: OpenAIApi,
    pinecone: PineconeClient,
    indexName: string,
    embeddingList: Map<string, number[]>,
    index: VectorOperationsApi,
    taskList: Task[],
    objective: string,
    modelName: string,
    taskLoop: string
): Promise<string> => {
    const RUN_LIMIT = parseInt(taskLoop, 10) || 3
    let finalResult = ''

    for (let run = 0; run < RUN_LIMIT; run++) {
        let enrichedResult: any
        let task: Task | undefined

        if (taskList.length > 0) {
            // Step 1: Pull the task
            task = taskList.shift()

            if (!task) {
                //console.log('No tasks left to complete. Exiting.')
                break
            }

            console.log(`\x1b[95m\x1b[1m\n*****TASK LIST*****\n\x1b[0m\x1b[0m
  ${taskList.map((t) => ` ${t?.priority}. ${t?.name}`).join('\n')}
  \x1b[92m\x1b[1m\n*****NEXT TASK*****\n\x1b[0m\x1b[0m
   ${task.name}`)

            // Step 2: Execute the task
            const result = await executionAgent(openai, pinecone, indexName, embeddingList, objective, task)
            console.log('\x1b[93m\x1b[1m\n*****TASK RESULT*****\n\x1b[0m\x1b[0m')
            console.log(result)
            finalResult = result

            // Step 3: Enrich result and store in Pinecone
            enrichedResult = { data: result }
            const vector = enrichedResult.data // extract the actual result from the dictionary
            const embeddingResult = await getADAEmbedding(openai, vector, embeddingList)
            await index.upsert({
                upsertRequest: {
                    vectors: [
                        {
                            id: task.id,
                            values: embeddingResult,
                            metadata: { task: task.name, result }
                        }
                    ]
                }
            })
        }

        // Step 4: Create new tasks and reprioritize task list
        if (enrichedResult) {
            const newTasks = await taskCreationAgent(openai, taskList, objective, enrichedResult.data, task!.name)
            //console.log('newTasks', newTasks)
            taskList = [...taskList, ...newTasks]

            taskList = await prioritizationAgent(openai, taskList, task!.priority, objective, modelName)
            //console.log(`Reprioritized task list: ${taskList.map((t) => `[${t?.priority}] ${t?.id}: ${t?.name}`).join(', ')}`)
        } else {
            break
        }
    }

    return finalResult
}

module.exports = { nodeClass: BabyAGI_Agents }
