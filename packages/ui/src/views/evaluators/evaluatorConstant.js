import i18next from 'i18next'

// TODO: Move this to a config file
export const evaluators = [
    {
        type: 'text',
        name: 'ContainsAny',
        label: i18next.t('evaluators.inputs.availableEvaluators.options.containsAny.title'),
        description: i18next.t('evaluators.inputs.availableEvaluators.options.containsAny.description')
    },
    {
        type: 'text',
        name: 'ContainsAll',
        label: i18next.t('evaluators.inputs.availableEvaluators.options.containsAll.title'),
        description: i18next.t('evaluators.inputs.availableEvaluators.options.containsAll.description')
    },
    {
        type: 'text',
        name: 'DoesNotContainAny',
        label: i18next.t('evaluators.inputs.availableEvaluators.options.doesNotContainAny.title'),
        description: i18next.t('evaluators.inputs.availableEvaluators.options.doesNotContainAny.description')
    },
    {
        type: 'text',
        name: 'DoesNotContainAll',
        label: i18next.t('evaluators.inputs.availableEvaluators.options.doesNotContainAll.title'),
        description: i18next.t('evaluators.inputs.availableEvaluators.options.doesNotContainAll.description')
    },
    {
        type: 'text',
        name: 'StartsWith',
        label: i18next.t('evaluators.inputs.availableEvaluators.options.startsWith.title'),
        description: i18next.t('evaluators.inputs.availableEvaluators.options.startsWith.description')
    },
    {
        type: 'text',
        name: 'NotStartsWith',
        label: i18next.t('evaluators.inputs.availableEvaluators.options.notStartsWith.title'),
        description: i18next.t('evaluators.inputs.availableEvaluators.options.notStartsWith.description')
    },
    {
        type: 'json',
        name: 'IsValidJSON',
        label: i18next.t('evaluators.inputs.availableEvaluators.options.isValidJSON.title'),
        description: i18next.t('evaluators.inputs.availableEvaluators.options.isValidJSON.description')
    },
    {
        type: 'json',
        name: 'IsNotValidJSON',
        label: i18next.t('evaluators.inputs.availableEvaluators.options.isNotValidJSON.title'),
        description: i18next.t('evaluators.inputs.availableEvaluators.options.isNotValidJSON.description')
    },
    {
        type: 'numeric',
        name: 'totalTokens',
        label: i18next.t('evaluators.inputs.availableEvaluators.options.totalTokens.title'),
        description: i18next.t('evaluators.inputs.availableEvaluators.options.totalTokens.description')
    },
    {
        type: 'numeric',
        label: i18next.t('evaluators.inputs.availableEvaluators.options.promptTokens.title'),
        name: 'promptTokens',
        description: i18next.t('evaluators.inputs.availableEvaluators.options.promptTokens.description')
    },
    {
        type: 'numeric',
        label: i18next.t('evaluators.inputs.availableEvaluators.options.completionTokens.title'),
        name: 'completionTokens',
        description: i18next.t('evaluators.inputs.availableEvaluators.options.completionTokens.description')
    },
    {
        type: 'numeric',
        label: i18next.t('evaluators.inputs.availableEvaluators.options.apiLatency.title'),
        name: 'apiLatency',
        description: i18next.t('evaluators.inputs.availableEvaluators.options.apiLatency.description')
    },
    {
        type: 'numeric',
        label: i18next.t('evaluators.inputs.availableEvaluators.options.llm.title'),
        name: 'llm',
        description: i18next.t('evaluators.inputs.availableEvaluators.options.llm.description')
    },
    {
        type: 'numeric',
        label: i18next.t('evaluators.inputs.availableEvaluators.options.chain.title'),
        name: 'chain',
        description: i18next.t('evaluators.inputs.availableEvaluators.options.chain.description')
    },
    {
        type: 'numeric',
        label: i18next.t('evaluators.inputs.availableEvaluators.options.responseLength.title'),
        name: 'responseLength',
        description: i18next.t('evaluators.inputs.availableEvaluators.options.responseLength.description')
    }
]

export const evaluatorTypes = [
    {
        label: i18next.t('evaluators.inputs.evaluatorType.options.text.title'),
        name: 'text',
        description: i18next.t('evaluators.inputs.evaluatorType.options.text.description')
    },
    {
        label: i18next.t('evaluators.inputs.evaluatorType.options.json.title'),
        name: 'json',
        description: i18next.t('evaluators.inputs.evaluatorType.options.json.description')
    },
    {
        label: i18next.t('evaluators.inputs.evaluatorType.options.numeric.title'),
        name: 'numeric',
        description: i18next.t('evaluators.inputs.evaluatorType.options.numeric.description')
    },
    {
        label: i18next.t('evaluators.inputs.evaluatorType.options.llm.title'),
        name: 'llm',
        description: i18next.t('evaluators.inputs.evaluatorType.options.llm.description')
    }
]

export const numericOperators = [
    {
        label: i18next.t('evaluators.inputs.selectOperator.operators.equals'),
        name: 'equals'
    },
    {
        label: i18next.t('evaluators.inputs.selectOperator.operators.notEquals'),
        name: 'notEquals'
    },
    {
        label: i18next.t('evaluators.inputs.selectOperator.operators.greaterThan'),
        name: 'greaterThan'
    },
    {
        label: i18next.t('evaluators.inputs.selectOperator.operators.lessThan'),
        name: 'lessThan'
    },
    {
        label: i18next.t('evaluators.inputs.selectOperator.operators.greaterThanOrEquals'),
        name: 'greaterThanOrEquals'
    },
    {
        label: i18next.t('evaluators.inputs.selectOperator.operators.lessThanOrEquals'),
        name: 'lessThanOrEquals'
    }
]
