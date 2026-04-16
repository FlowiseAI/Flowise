// TODO: Move this to a config file
export const getEvaluators = (t) => [
    {
        type: 'text',
        name: 'ContainsAny',
        label: t('evaluators.inputs.availableEvaluators.options.containsAny.title'),
        description: t('evaluators.inputs.availableEvaluators.options.containsAny.description')
    },
    {
        type: 'text',
        name: 'ContainsAll',
        label: t('evaluators.inputs.availableEvaluators.options.containsAll.title'),
        description: t('evaluators.inputs.availableEvaluators.options.containsAll.description')
    },
    {
        type: 'text',
        name: 'DoesNotContainAny',
        label: t('evaluators.inputs.availableEvaluators.options.doesNotContainAny.title'),
        description: t('evaluators.inputs.availableEvaluators.options.doesNotContainAny.description')
    },
    {
        type: 'text',
        name: 'DoesNotContainAll',
        label: t('evaluators.inputs.availableEvaluators.options.doesNotContainAll.title'),
        description: t('evaluators.inputs.availableEvaluators.options.doesNotContainAll.description')
    },
    {
        type: 'text',
        name: 'StartsWith',
        label: t('evaluators.inputs.availableEvaluators.options.startsWith.title'),
        description: t('evaluators.inputs.availableEvaluators.options.startsWith.description')
    },
    {
        type: 'text',
        name: 'NotStartsWith',
        label: t('evaluators.inputs.availableEvaluators.options.notStartsWith.title'),
        description: t('evaluators.inputs.availableEvaluators.options.notStartsWith.description')
    },
    {
        type: 'json',
        name: 'IsValidJSON',
        label: t('evaluators.inputs.availableEvaluators.options.isValidJSON.title'),
        description: t('evaluators.inputs.availableEvaluators.options.isValidJSON.description')
    },
    {
        type: 'json',
        name: 'IsNotValidJSON',
        label: t('evaluators.inputs.availableEvaluators.options.isNotValidJSON.title'),
        description: t('evaluators.inputs.availableEvaluators.options.isNotValidJSON.description')
    },
    {
        type: 'numeric',
        name: 'totalTokens',
        label: t('evaluators.inputs.availableEvaluators.options.totalTokens.title'),
        description: t('evaluators.inputs.availableEvaluators.options.totalTokens.description')
    },
    {
        type: 'numeric',
        label: t('evaluators.inputs.availableEvaluators.options.promptTokens.title'),
        name: 'promptTokens',
        description: t('evaluators.inputs.availableEvaluators.options.promptTokens.description')
    },
    {
        type: 'numeric',
        label: t('evaluators.inputs.availableEvaluators.options.completionTokens.title'),
        name: 'completionTokens',
        description: t('evaluators.inputs.availableEvaluators.options.completionTokens.description')
    },
    {
        type: 'numeric',
        label: t('evaluators.inputs.availableEvaluators.options.apiLatency.title'),
        name: 'apiLatency',
        description: t('evaluators.inputs.availableEvaluators.options.apiLatency.description')
    },
    {
        type: 'numeric',
        label: t('evaluators.inputs.availableEvaluators.options.llm.title'),
        name: 'llm',
        description: t('evaluators.inputs.availableEvaluators.options.llm.description')
    },
    {
        type: 'numeric',
        label: t('evaluators.inputs.availableEvaluators.options.chain.title'),
        name: 'chain',
        description: t('evaluators.inputs.availableEvaluators.options.chain.description')
    },
    {
        type: 'numeric',
        label: t('evaluators.inputs.availableEvaluators.options.responseLength.title'),
        name: 'responseLength',
        description: t('evaluators.inputs.availableEvaluators.options.responseLength.description')
    }
]

export const getEvaluatorTypes = (t) => [
    {
        label: t('evaluators.inputs.evaluatorType.options.text.title'),
        name: 'text',
        description: t('evaluators.inputs.evaluatorType.options.text.description')
    },
    {
        label: t('evaluators.inputs.evaluatorType.options.json.title'),
        name: 'json',
        description: t('evaluators.inputs.evaluatorType.options.json.description')
    },
    {
        label: t('evaluators.inputs.evaluatorType.options.numeric.title'),
        name: 'numeric',
        description: t('evaluators.inputs.evaluatorType.options.numeric.description')
    },
    {
        label: t('evaluators.inputs.evaluatorType.options.llm.title'),
        name: 'llm',
        description: t('evaluators.inputs.evaluatorType.options.llm.description')
    }
]

export const getNumericOperators = (t) => [
    {
        label: t('evaluators.inputs.selectOperator.operators.equals'),
        name: 'equals'
    },
    {
        label: t('evaluators.inputs.selectOperator.operators.notEquals'),
        name: 'notEquals'
    },
    {
        label: t('evaluators.inputs.selectOperator.operators.greaterThan'),
        name: 'greaterThan'
    },
    {
        label: t('evaluators.inputs.selectOperator.operators.lessThan'),
        name: 'lessThan'
    },
    {
        label: t('evaluators.inputs.selectOperator.operators.greaterThanOrEquals'),
        name: 'greaterThanOrEquals'
    },
    {
        label: t('evaluators.inputs.selectOperator.operators.lessThanOrEquals'),
        name: 'lessThanOrEquals'
    }
]
