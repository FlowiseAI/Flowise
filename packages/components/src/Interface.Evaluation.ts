// Evaluation Related Interfaces
export interface IDataset {
    id: string
    name: string
    createdDate: Date
    updatedDate: Date
}
export interface IDatasetRow {
    id: string
    datasetId: string
    input: string
    output: string
    updatedDate: Date
}

export enum EvaluationStatus {
    PENDING = 'pending',
    COMPLETED = 'completed'
}
export interface IEvaluation {
    id: string
    name: string
    chatflowId: string
    chatflowName: string
    datasetId: string
    datasetName: string
    evaluationType: string
    average_metrics: string
    status: string
    runDate: Date
}

export interface IEvaluationRun {
    id: string
    evaluationId: string
    input: string
    expectedOutput: string
    actualOutput: string
    metrics: string
    runDate: Date
    reasoning: string
    score: number
}
