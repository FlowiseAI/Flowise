import { convertSchemaToZod, ICommonObject } from 'flowise-components'
import { z } from 'zod'
import { RunnableSequence } from '@langchain/core/runnables'
import { PromptTemplate } from '@langchain/core/prompts'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { databaseEntities } from '../../utils'

export class LLMEvaluationRunner {
    private llm: any

    async runLLMEvaluators(data: ICommonObject, actualOutputArray: string[], errorArray: string[], llmEvaluatorMap: any[]) {
        const evaluationResults: any[] = []
        if (this.llm === undefined) {
            this.llm = await this.createLLM(data)
        }

        for (let j = 0; j < actualOutputArray.length; j++) {
            const actualOutput = actualOutputArray[j]
            for (let i = 0; i < llmEvaluatorMap.length; i++) {
                if (errorArray[j] !== '') {
                    evaluationResults.push({
                        error: 'Not Graded!'
                    })
                    continue
                }
                try {
                    const llmEvaluator = llmEvaluatorMap[i]
                    let evaluator = llmEvaluator.evaluator
                    const schema = z.object(convertSchemaToZod(JSON.stringify(evaluator.outputSchema)))
                    const modelWithStructuredOutput = this.llm.withStructuredOutput(schema)
                    const llmExecutor = RunnableSequence.from([
                        PromptTemplate.fromTemplate(evaluator.prompt as string),
                        modelWithStructuredOutput
                    ])
                    const response = await llmExecutor.invoke({
                        question: data.input,
                        actualOutput: actualOutput,
                        expectedOutput: data.expectedOutput
                    })
                    evaluationResults.push(response)
                } catch (error) {
                    evaluationResults.push({
                        error: 'error'
                    })
                }
            }
        }
        return evaluationResults
    }

    async createLLM(data: ICommonObject): Promise<any> {
        try {
            const appServer = getRunningExpressApp()
            const nodeInstanceFilePath = appServer.nodesPool.componentNodes[data.llmConfig.llm].filePath as string
            const nodeModule = await import(nodeInstanceFilePath)
            const newNodeInstance = new nodeModule.nodeClass()
            let nodeData = {
                inputs: { modelName: data.llmConfig.model },
                credential: data.llmConfig.credentialId,
                id: 'llm_0'
            }
            const options: ICommonObject = {
                appDataSource: appServer.AppDataSource,
                databaseEntities: databaseEntities
            }
            return await newNodeInstance.init(nodeData, undefined, options)
        } catch (error) {
            throw new Error('Error creating LLM')
        }
    }
}
