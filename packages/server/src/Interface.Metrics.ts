export interface IMetricsProvider {
    initializeCounters(): void
    setupMetricsEndpoint(): void
    incrementCounter(counter: FLOWISE_COUNTER, payload: any): void
}

export enum FLOWISE_COUNTER_STATUS {
    SUCCESS = 'success',
    FAILURE = 'failure'
}

export enum FLOWISE_COUNTER {
    CHATFLOW_CREATED = 'chatflow_created',
    AGENTFLOW_CREATED = 'agentflow_created',
    ASSISTANT_CREATED = 'assistant_created',
    TOOL_CREATED = 'tool_created',

    CHATFLOW_PREDICTION_INTERNAL = 'chatflow_prediction_internal',
    CHATFLOW_PREDICTION_EXTERNAL = 'chatflow_prediction_external',

    AGENTFLOW_PREDICTION_INTERNAL = 'agentflow_prediction_internal',
    AGENTFLOW_PREDICTION_EXTERNAL = 'agentflow_prediction_external'
}
