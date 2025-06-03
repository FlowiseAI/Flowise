// Evaluation Related Interfaces
import { Evaluator } from './database/entities/Evaluator'

export interface IDataset {
    id: string
    name: string
    description: string
    createdDate: Date
    updatedDate: Date
    workspaceId?: string
}
export interface IDatasetRow {
    id: string
    datasetId: string
    input: string
    output: string
    updatedDate: Date
    sequenceNo: number
}

export enum EvaluationStatus {
    PENDING = 'pending',
    COMPLETED = 'completed',
    ERROR = 'error'
}

export interface IEvaluation {
    id: string
    name: string
    chatflowId: string
    chatflowName: string
    datasetId: string
    datasetName: string
    evaluationType: string
    additionalConfig: string //json
    average_metrics: string //json
    status: string
    runDate: Date
    workspaceId?: string
}

export interface IEvaluationResult extends IEvaluation {
    latestEval: boolean
    version: number
}

export interface IEvaluationRun {
    id: string
    evaluationId: string
    input: string
    expectedOutput: string
    actualOutput: string // JSON
    metrics: string // JSON
    runDate: Date
    llmEvaluators?: string // JSON
    evaluators?: string // JSON
    errors?: string // JSON
}

export interface IEvaluator {
    id: string
    name: string
    type: string
    config: string // JSON
    updatedDate: Date
    createdDate: Date
    workspaceId?: string
}

export class EvaluatorDTO {
    id: string
    name: string
    type: string
    measure?: string
    operator?: string
    value?: string
    prompt?: string
    evaluatorType?: string
    outputSchema?: []
    updatedDate: Date
    createdDate: Date

    static toEntity(body: any): Evaluator {
        const newDs = new Evaluator()
        Object.assign(newDs, body)
        let config: any = {}
        if (body.type === 'llm') {
            config = {
                prompt: body.prompt,
                outputSchema: body.outputSchema
            }
        } else if (body.type === 'text') {
            config = {
                operator: body.operator,
                value: body.value
            }
        } else if (body.type === 'json') {
            config = {
                operator: body.operator
            }
        } else if (body.type === 'numeric') {
            config = {
                operator: body.operator,
                value: body.value,
                measure: body.measure
            }
        } else {
            throw new Error('Invalid evaluator type')
        }
        newDs.config = JSON.stringify(config)
        return newDs
    }

    static fromEntity(entity: Evaluator): EvaluatorDTO {
        const newDs = new EvaluatorDTO()
        Object.assign(newDs, entity)
        const config = JSON.parse(entity.config)
        if (entity.type === 'llm') {
            newDs.prompt = config.prompt
            newDs.outputSchema = config.outputSchema
        } else if (entity.type === 'text') {
            newDs.operator = config.operator
            newDs.value = config.value
        } else if (entity.type === 'json') {
            newDs.operator = config.operator
            newDs.value = config.value
        } else if (entity.type === 'numeric') {
            newDs.operator = config.operator
            newDs.value = config.value
            newDs.measure = config.measure
        }
        delete (newDs as any).config
        return newDs
    }

    static fromEntities(entities: Evaluator[]): EvaluatorDTO[] {
        return entities.map((entity) => this.fromEntity(entity))
    }
}
