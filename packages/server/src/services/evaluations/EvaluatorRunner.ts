import evaluatorsService from '../evaluator'
import { ICommonObject } from 'flowise-components'

interface EvaluatorReturnType {
    name: string
    type?: string
    operator?: string
    measure?: string
    value?: string
    result: 'Pass' | 'Fail' | 'Error'
}

export const runAdditionalEvaluators = async (
    metricsArray: ICommonObject[],
    actualOutputArray: string[],
    errorArray: string[],
    selectedEvaluators: string[],
    workspaceId: string
) => {
    const evaluationResults: any[] = []
    const evaluatorDict: any = {}

    for (let j = 0; j < actualOutputArray.length; j++) {
        const subArray: EvaluatorReturnType[] = []
        const actualOutput = actualOutputArray[j].toLowerCase().trim()

        for (let i = 0; i < selectedEvaluators.length; i++) {
            const evaluatorId = selectedEvaluators[i]
            let evaluator = evaluatorDict[evaluatorId]
            if (!evaluator) {
                evaluator = await evaluatorsService.getEvaluator(evaluatorId, workspaceId)
                evaluatorDict[evaluatorId] = evaluator
            }

            // iterate through each actual output and run the evaluator
            const returnFields: EvaluatorReturnType = {
                ...evaluator
            }
            if (errorArray[j]) {
                // if this output is an error, skip over the evaluators.
                subArray.push({
                    ...returnFields,
                    result: 'Error'
                })
                continue
            }
            try {
                if (evaluator.type === 'numeric') {
                    const metric = metricsArray[j]
                    const metricValue = metric[evaluator.measure]

                    subArray.push({
                        ...returnFields,
                        result: evaluateExpression(
                            evaluator.measure !== 'responseLength' ? metricValue : actualOutput.length,
                            evaluator.operator,
                            evaluator.value
                        )
                            ? 'Pass'
                            : 'Fail'
                    })
                }
                if (evaluator.type === 'json') {
                    const operator = evaluator.operator
                    let passed = false
                    if (operator === 'IsValidJSON') {
                        try {
                            passed = JSON.parse(actualOutput) !== undefined
                        } catch (error) {
                            passed = false
                        }
                    } else if (operator === 'IsNotValidJSON') {
                        try {
                            JSON.parse(actualOutput)
                            passed = false
                        } catch (error) {
                            passed = true
                        }
                    }
                    subArray.push({
                        ...returnFields,
                        result: passed ? 'Pass' : 'Fail'
                    })
                }
                if (evaluator.type === 'text') {
                    const operator = evaluator.operator
                    const value = evaluator.value.toLowerCase().trim() as string
                    let splitValues = []
                    let passed = false
                    switch (operator) {
                        case 'NotStartsWith':
                            subArray.push({
                                ...returnFields,
                                result: actualOutput.startsWith(value) ? 'Fail' : 'Pass'
                            })
                            break
                        case 'StartsWith':
                            subArray.push({
                                ...returnFields,
                                result: actualOutput.startsWith(value) ? 'Pass' : 'Fail'
                            })
                            break
                        case 'ContainsAny':
                            passed = false
                            splitValues = value.split(',').map((v) => v.trim().toLowerCase()) // Split, trim, and convert to lowercase
                            for (let i = 0; i < splitValues.length; i++) {
                                if (actualOutput.includes(splitValues[i])) {
                                    passed = true
                                    break
                                }
                            }
                            subArray.push({
                                ...returnFields,
                                result: passed ? 'Pass' : 'Fail'
                            })
                            break
                        case 'ContainsAll':
                            passed = true
                            splitValues = value.split(',').map((v) => v.trim().toLowerCase()) // Split, trim, and convert to lowercase
                            for (let i = 0; i < splitValues.length; i++) {
                                if (!actualOutput.includes(splitValues[i])) {
                                    passed = false
                                    break
                                }
                            }
                            subArray.push({
                                ...returnFields,
                                result: passed ? 'Pass' : 'Fail'
                            })
                            break
                        case 'DoesNotContainAny':
                            passed = true
                            splitValues = value.split(',').map((v) => v.trim().toLowerCase()) // Split, trim, and convert to lowercase
                            for (let i = 0; i < splitValues.length; i++) {
                                if (actualOutput.includes(splitValues[i])) {
                                    passed = false
                                    break
                                }
                            }
                            subArray.push({
                                ...returnFields,
                                result: passed ? 'Fail' : 'Pass'
                            })
                            break
                        case 'DoesNotContainAll':
                            passed = true
                            splitValues = value.split(',').map((v) => v.trim().toLowerCase()) // Split, trim, and convert to lowercase
                            for (let i = 0; i < splitValues.length; i++) {
                                if (actualOutput.includes(splitValues[i])) {
                                    passed = false
                                    break
                                }
                            }
                            subArray.push({
                                ...returnFields,
                                result: passed ? 'Pass' : 'Fail'
                            })
                            break
                    }
                }
            } catch (error) {
                subArray.push({
                    name: evaluator?.name || 'Missing Evaluator',
                    result: 'Error'
                })
            }
        }
        evaluationResults.push(subArray)
    }
    // iterate through the array of evaluation results and count the number of passes and fails using the result key
    let passCount = 0
    let failCount = 0
    let errorCount = 0
    for (let i = 0; i < evaluationResults.length; i++) {
        const subArray = evaluationResults[i]
        for (let j = 0; j < subArray.length; j++) {
            if (subArray[j].result === 'Pass') {
                passCount++
            } else if (subArray[j].result === 'Fail') {
                failCount++
            } else if (subArray[j].result === 'Error') {
                errorCount++
            }
            delete subArray[j].createdDate
            delete subArray[j].updatedDate
        }
    }
    return {
        results: evaluationResults,
        evaluatorMetrics: {
            passCount,
            failCount,
            errorCount
        }
    }
}

const evaluateExpression = (actual: number, operator: string, expected: string) => {
    switch (operator) {
        case 'equals':
            return actual === parseInt(expected)
        case 'notEquals':
            return actual !== parseInt(expected)
        case 'greaterThan':
            return actual > parseInt(expected)
        case 'lessThan':
            return actual < parseInt(expected)
        case 'greaterThanOrEquals':
            return actual >= parseInt(expected)
        case 'lessThanOrEquals':
            return actual <= parseInt(expected)
        default:
            return false
    }
}
