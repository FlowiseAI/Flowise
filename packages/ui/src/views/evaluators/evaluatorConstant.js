// TODO: Move this to a config file
export const evaluators = [
    {
        type: 'text',
        name: 'ContainsAny',
        label: 'Contains Any',
        description: 'Returns true if any of the specified comma separated values are present in the response.'
    },
    {
        type: 'text',
        name: 'ContainsAll',
        label: 'Contains All',
        description: 'Returns true if ALL of the specified comma separated values are present in the response.'
    },
    {
        type: 'text',
        name: 'DoesNotContainAny',
        label: 'Does Not Contains Any',
        description: 'Returns true if any of the specified comma separated values are present in the response.'
    },
    {
        type: 'text',
        name: 'DoesNotContainAll',
        label: 'Does Not Contains All',
        description: 'Returns true if ALL of the specified comma separated values are present in the response.'
    },
    {
        type: 'text',
        name: 'StartsWith',
        label: 'Starts With',
        description: 'Returns true if the response starts with the specified value.'
    },
    {
        type: 'text',
        name: 'NotStartsWith',
        label: 'Does Not Start With',
        description: 'Returns true if the response does not start with the specified value.'
    },
    {
        type: 'json',
        name: 'IsValidJSON',
        label: 'Is Valid JSON',
        description: 'Returns true if the response is a valid JSON.'
    },
    {
        type: 'json',
        name: 'IsNotValidJSON',
        label: 'Is Not a Valid JSON',
        description: 'Returns true if the response is a not a valid JSON.'
    },
    {
        type: 'numeric',
        name: 'totalTokens',
        label: 'Total Tokens',
        description: 'Sum of Prompt Tokens and Completion Tokens.'
    },
    {
        type: 'numeric',
        label: 'Prompt Tokens',
        name: 'promptTokens',
        description: 'This is the number of tokens in your prompt.'
    },
    {
        type: 'numeric',
        label: 'Completion Tokens',
        name: 'completionTokens',
        description: 'Completion tokens are any tokens that the model generates in response to your input.'
    },
    {
        type: 'numeric',
        label: 'Total API Latency',
        name: 'apiLatency',
        description: 'Total time taken for the Flowise Prediction API call (milliseconds).'
    },
    {
        type: 'numeric',
        label: 'LLM Latency',
        name: 'llm',
        description: 'Actual LLM invocation time (milliseconds).'
    },
    {
        type: 'numeric',
        label: 'Chatflow Latency',
        name: 'chain',
        description: 'Actual time spent in executing the chatflow (milliseconds).'
    },
    {
        type: 'numeric',
        label: 'Output Chars Length',
        name: 'responseLength',
        description: 'Number of characters in the response.'
    }
]

export const evaluatorTypes = [
    {
        label: 'Evaluate Result (Text Based)',
        name: 'text',
        description: 'Set of Evaluators to evaluate the result of a Chatflow.'
    },
    {
        label: 'Evaluate Result (JSON)',
        name: 'json',
        description: 'Set of Evaluators to evaluate the JSON response of a Chatflow.'
    },
    {
        label: 'Evaluate Metrics (Numeric)',
        name: 'numeric',
        description: 'Set of Evaluators that evaluate the metrics (latency, tokens, cost, length of response) of a Chatflow.'
    },
    {
        label: 'LLM based Grading (JSON)',
        name: 'llm',
        description: 'Post execution, grades the answers by using an LLM.'
    }
]

export const numericOperators = [
    {
        label: 'Equals',
        name: 'equals'
    },
    {
        label: 'Not Equals',
        name: 'notEquals'
    },
    {
        label: 'Greater Than',
        name: 'greaterThan'
    },
    {
        label: 'Less Than',
        name: 'lessThan'
    },
    {
        label: 'Greater Than or Equals',
        name: 'greaterThanOrEquals'
    },
    {
        label: 'Less Than or Equals',
        name: 'lessThanOrEquals'
    }
]
