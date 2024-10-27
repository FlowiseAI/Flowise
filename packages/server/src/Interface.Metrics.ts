export interface IMetricsProvider {
    getName(): string
    initializeCounters(): void
    setupMetricsEndpoint(): void
    incrementCounter(counter: FLOWISE_METRIC_COUNTERS, payload: any): void
}

export enum FLOWISE_COUNTER_STATUS {
    SUCCESS = 'success',
    FAILURE = 'failure'
}

export enum FLOWISE_METRIC_COUNTERS {
    CHATFLOW_CREATED = 'chatflow_created',
    AGENTFLOW_CREATED = 'agentflow_created',
    ASSISTANT_CREATED = 'assistant_created',
    TOOL_CREATED = 'tool_created',
    VECTORSTORE_UPSERT = 'vector_upserted',

    CHATFLOW_PREDICTION_INTERNAL = 'chatflow_prediction_internal',
    CHATFLOW_PREDICTION_EXTERNAL = 'chatflow_prediction_external',

    AGENTFLOW_PREDICTION_INTERNAL = 'agentflow_prediction_internal',
    AGENTFLOW_PREDICTION_EXTERNAL = 'agentflow_prediction_external'
}
