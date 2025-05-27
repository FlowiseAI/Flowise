import { ICommonObject } from 'flowise-components'

// fractionDigits is the number of digits after the decimal point, for display purposes
const fractionDigits = 2
// This function calculates the cost of the tokens from a metrics array
export const calculateCost = (metricsArray: ICommonObject[]) => {
    for (let i = 0; i < metricsArray.length; i++) {
        const metric = metricsArray[i]
        const model = metric.model
        if (!model) {
            continue
        }
        const completionTokens = metric.completionTokens
        const promptTokens = metric.promptTokens
        const totalTokens = metric.totalTokens

        let promptTokensCost: string = '0'
        let completionTokensCost: string = '0'
        let totalTokensCost = '0'
        if (metric.cost_values) {
            const costValues = metric.cost_values
            if (costValues.total_price > 0) {
                let cost = costValues.total_cost * (totalTokens / 1000)
                if (cost < 0.01) {
                    totalTokensCost = '$ <0.01'
                } else {
                    totalTokensCost = '$ ' + cost.toFixed(fractionDigits)
                }
            } else {
                let totalCost = 0
                if (promptTokens) {
                    const cost = costValues.input_cost * (promptTokens / 1000)
                    totalCost += cost
                    if (cost < 0.01) {
                        promptTokensCost = '$ <0.01'
                    } else {
                        promptTokensCost = '$ ' + cost.toFixed(fractionDigits)
                    }
                }
                if (completionTokens) {
                    const cost = costValues.output_cost * (completionTokens / 1000)
                    totalCost += cost
                    if (cost < 0.01) {
                        completionTokensCost = '$ <0.01'
                    } else {
                        completionTokensCost = '$ ' + cost.toFixed(fractionDigits)
                    }
                }
                if (totalCost < 0.01) {
                    totalTokensCost = '$ <0.01'
                } else {
                    totalTokensCost = '$ ' + totalCost.toFixed(fractionDigits)
                }
            }
        }
        metric['totalCost'] = totalTokensCost
        metric['promptCost'] = promptTokensCost
        metric['completionCost'] = completionTokensCost
    }
}
