import { StatusCodes } from 'http-status-codes'
import { EvaluationRunner, ICommonObject } from 'flowise-components'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { Dataset } from '../../database/entities/Dataset'
import { DatasetRow } from '../../database/entities/DatasetRow'
import { Evaluation } from '../../database/entities/Evaluation'
import { EvaluationStatus, IEvaluationResult } from '../../Interface'
import { EvaluationRun } from '../../database/entities/EvaluationRun'
import { Credential } from '../../database/entities/Credential'
import { ApiKey } from '../../database/entities/ApiKey'
import { ChatFlow } from '../../database/entities/ChatFlow'
import { getAppVersion } from '../../utils'
import { In } from 'typeorm'
import { getWorkspaceSearchOptions } from '../../enterprise/utils/ControllerServiceUtils'
import { v4 as uuidv4 } from 'uuid'
import { calculateCost, formatCost } from './CostCalculator'
import { runAdditionalEvaluators } from './EvaluatorRunner'
import evaluatorsService from '../evaluator'
import { LLMEvaluationRunner } from './LLMEvaluationRunner'
import { Assistant } from '../../database/entities/Assistant'

const runAgain = async (id: string, baseURL: string, orgId: string, workspaceId: string) => {
    try {
        const appServer = getRunningExpressApp()
        const evaluation = await appServer.AppDataSource.getRepository(Evaluation).findOneBy({
            id: id,
            workspaceId: workspaceId
        })
        if (!evaluation) throw new Error(`Evaluation ${id} not found`)
        const additionalConfig = evaluation.additionalConfig ? JSON.parse(evaluation.additionalConfig) : {}
        const data: ICommonObject = {
            chatflowId: evaluation.chatflowId,
            chatflowName: evaluation.chatflowName,
            datasetName: evaluation.datasetName,
            datasetId: evaluation.datasetId,
            evaluationType: evaluation.evaluationType,
            selectedSimpleEvaluators: JSON.stringify(additionalConfig.simpleEvaluators),
            datasetAsOneConversation: additionalConfig.datasetAsOneConversation,
            chatflowType: JSON.stringify(additionalConfig.chatflowTypes ? additionalConfig.chatflowTypes : [])
        }
        data.name = evaluation.name
        data.workspaceId = evaluation.workspaceId
        if (evaluation.evaluationType === 'llm') {
            data.selectedLLMEvaluators = JSON.stringify(additionalConfig.lLMEvaluators)
            data.credentialId = additionalConfig.credentialId
            // this is to preserve backward compatibility for evaluations created before the llm/model options were added
            if (!additionalConfig.credentialId && additionalConfig.llmConfig) {
                data.model = additionalConfig.llmConfig.model
                data.llm = additionalConfig.llmConfig.llm
                data.credentialId = additionalConfig.llmConfig.credentialId
            } else {
                data.model = 'gpt-3.5-turbo'
                data.llm = 'OpenAI'
            }
        }
        data.version = true
        return await createEvaluation(data, baseURL, orgId, workspaceId)
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: EvalsService.runAgain - ${getErrorMessage(error)}`)
    }
}

const createEvaluation = async (body: ICommonObject, baseURL: string, orgId: string, workspaceId: string) => {
    try {
        const appServer = getRunningExpressApp()
        const newEval = new Evaluation()
        Object.assign(newEval, body)
        newEval.status = EvaluationStatus.PENDING

        const row = appServer.AppDataSource.getRepository(Evaluation).create(newEval)
        row.average_metrics = JSON.stringify({})

        const additionalConfig: ICommonObject = {
            chatflowTypes: body.chatflowType ? JSON.parse(body.chatflowType) : [],
            datasetAsOneConversation: body.datasetAsOneConversation,
            simpleEvaluators: body.selectedSimpleEvaluators.length > 0 ? JSON.parse(body.selectedSimpleEvaluators) : []
        }

        if (body.evaluationType === 'llm') {
            additionalConfig.lLMEvaluators = body.selectedLLMEvaluators.length > 0 ? JSON.parse(body.selectedLLMEvaluators) : []
            additionalConfig.llmConfig = {
                credentialId: body.credentialId,
                llm: body.llm,
                model: body.model
            }
        }
        row.additionalConfig = JSON.stringify(additionalConfig)
        const newEvaluation = await appServer.AppDataSource.getRepository(Evaluation).save(row)

        await appServer.telemetry.sendTelemetry(
            'evaluation_created',
            {
                version: await getAppVersion()
            },
            orgId
        )

        const dataset = await appServer.AppDataSource.getRepository(Dataset).findOneBy({
            id: body.datasetId,
            workspaceId: workspaceId
        })
        if (!dataset) throw new Error(`Dataset ${body.datasetId} not found`)

        const items = await appServer.AppDataSource.getRepository(DatasetRow).find({
            where: { datasetId: dataset.id },
            order: { sequenceNo: 'ASC' }
        })
        ;(dataset as any).rows = items

        const data: ICommonObject = {
            chatflowId: body.chatflowId,
            dataset: dataset,
            evaluationType: body.evaluationType,
            evaluationId: newEvaluation.id,
            credentialId: body.credentialId
        }
        if (body.datasetAsOneConversation) {
            data.sessionId = uuidv4()
        }

        // When chatflow has an APIKey
        const apiKeys: { chatflowId: string; apiKey: string }[] = []
        const chatflowIds = JSON.parse(body.chatflowId)
        for (let i = 0; i < chatflowIds.length; i++) {
            const chatflowId = chatflowIds[i]
            const cFlow = await appServer.AppDataSource.getRepository(ChatFlow).findOneBy({
                id: chatflowId,
                workspaceId: workspaceId
            })
            if (cFlow && cFlow.apikeyid) {
                const apikeyObj = await appServer.AppDataSource.getRepository(ApiKey).findOneBy({
                    id: cFlow.apikeyid
                })
                if (apikeyObj) {
                    apiKeys.push({
                        chatflowId: chatflowId,
                        apiKey: apikeyObj.apiKey
                    })
                }
            }
        }
        if (apiKeys.length > 0) {
            data.apiKeys = apiKeys
        }

        // save the evaluation with status as pending
        const evalRunner = new EvaluationRunner(baseURL)
        if (body.evaluationType === 'llm') {
            const credential = await appServer.AppDataSource.getRepository(Credential).findOneBy({
                id: body.credentialId
            })

            if (!credential) throw new Error(`Credential ${body.credentialId} not found`)
        }

        let evalMetrics = { passCount: 0, failCount: 0, errorCount: 0 }
        evalRunner
            .runEvaluations(data)
            .then(async (result) => {
                let totalTime = 0
                // let us assume that the eval is successful
                let allRowsSuccessful = true
                try {
                    const llmEvaluationRunner = new LLMEvaluationRunner()
                    for (const resultRow of result.rows) {
                        const metricsArray: ICommonObject[] = []
                        const actualOutputArray: string[] = []
                        const errorArray: string[] = []
                        for (const evaluationRow of resultRow.evaluations) {
                            if (evaluationRow.status === 'error') {
                                // if a row failed, mark the entire run as failed (error)
                                allRowsSuccessful = false
                            }
                            actualOutputArray.push(evaluationRow.actualOutput)
                            totalTime += parseFloat(evaluationRow.latency)
                            let metricsObjFromRun: ICommonObject = {}

                            let nested_metrics = evaluationRow.nested_metrics

                            let promptTokens = 0,
                                completionTokens = 0,
                                totalTokens = 0
                            let inputCost = 0,
                                outputCost = 0,
                                totalCost = 0
                            if (nested_metrics && nested_metrics.length > 0) {
                                for (let i = 0; i < nested_metrics.length; i++) {
                                    const nested_metric = nested_metrics[i]
                                    if (nested_metric.model && nested_metric.promptTokens > 0) {
                                        promptTokens += nested_metric.promptTokens
                                        completionTokens += nested_metric.completionTokens
                                        totalTokens += nested_metric.totalTokens

                                        inputCost += nested_metric.cost_values.input_cost
                                        outputCost += nested_metric.cost_values.output_cost
                                        totalCost += nested_metric.cost_values.total_cost

                                        nested_metric['totalCost'] = formatCost(nested_metric.cost_values.total_cost)
                                        nested_metric['promptCost'] = formatCost(nested_metric.cost_values.input_cost)
                                        nested_metric['completionCost'] = formatCost(nested_metric.cost_values.output_cost)
                                    }
                                }
                                nested_metrics = nested_metrics.filter((metric: any) => {
                                    return metric.model && metric.provider
                                })
                            }
                            const metrics = evaluationRow.metrics
                            if (metrics) {
                                if (nested_metrics && nested_metrics.length > 0) {
                                    metrics.push({
                                        promptTokens: promptTokens,
                                        completionTokens: completionTokens,
                                        totalTokens: totalTokens,
                                        totalCost: formatCost(totalCost),
                                        promptCost: formatCost(inputCost),
                                        completionCost: formatCost(outputCost)
                                    })
                                    metricsObjFromRun.nested_metrics = nested_metrics
                                }
                                metrics.map((metric: any) => {
                                    if (metric) {
                                        const json = typeof metric === 'object' ? metric : JSON.parse(metric)
                                        Object.getOwnPropertyNames(json).map((key) => {
                                            metricsObjFromRun[key] = json[key]
                                        })
                                    }
                                })
                                metricsArray.push(metricsObjFromRun)
                            }
                            errorArray.push(evaluationRow.error)
                        }

                        const newRun = new EvaluationRun()
                        newRun.evaluationId = newEvaluation.id
                        newRun.runDate = new Date()
                        newRun.input = resultRow.input
                        newRun.expectedOutput = resultRow.expectedOutput
                        newRun.actualOutput = JSON.stringify(actualOutputArray)
                        newRun.errors = JSON.stringify(errorArray)
                        calculateCost(metricsArray)
                        newRun.metrics = JSON.stringify(metricsArray)

                        const { results, evaluatorMetrics } = await runAdditionalEvaluators(
                            metricsArray,
                            actualOutputArray,
                            errorArray,
                            body.selectedSimpleEvaluators.length > 0 ? JSON.parse(body.selectedSimpleEvaluators) : [],
                            workspaceId
                        )

                        newRun.evaluators = JSON.stringify(results)
                        evalMetrics.passCount += evaluatorMetrics.passCount
                        evalMetrics.failCount += evaluatorMetrics.failCount
                        evalMetrics.errorCount += evaluatorMetrics.errorCount

                        if (body.evaluationType === 'llm') {
                            resultRow.llmConfig = additionalConfig.llmConfig
                            resultRow.LLMEvaluators = body.selectedLLMEvaluators.length > 0 ? JSON.parse(body.selectedLLMEvaluators) : []
                            const llmEvaluatorMap: { evaluatorId: string; evaluator: any }[] = []
                            for (let i = 0; i < resultRow.LLMEvaluators.length; i++) {
                                const evaluatorId = resultRow.LLMEvaluators[i]
                                const evaluator = await evaluatorsService.getEvaluator(evaluatorId, workspaceId)
                                llmEvaluatorMap.push({
                                    evaluatorId: evaluatorId,
                                    evaluator: evaluator
                                })
                            }
                            // iterate over the actualOutputArray and add the actualOutput to the evaluationLineItem object
                            const resultArray = await llmEvaluationRunner.runLLMEvaluators(
                                resultRow,
                                actualOutputArray,
                                errorArray,
                                llmEvaluatorMap
                            )
                            newRun.llmEvaluators = JSON.stringify(resultArray)
                            const row = appServer.AppDataSource.getRepository(EvaluationRun).create(newRun)
                            await appServer.AppDataSource.getRepository(EvaluationRun).save(row)
                        } else {
                            const row = appServer.AppDataSource.getRepository(EvaluationRun).create(newRun)
                            await appServer.AppDataSource.getRepository(EvaluationRun).save(row)
                        }
                    }
                    //update the evaluation with status as completed
                    let passPercent = -1
                    if (evalMetrics.passCount + evalMetrics.failCount + evalMetrics.errorCount > 0) {
                        passPercent =
                            (evalMetrics.passCount / (evalMetrics.passCount + evalMetrics.failCount + evalMetrics.errorCount)) * 100
                    }
                    appServer.AppDataSource.getRepository(Evaluation)
                        .findOneBy({ id: newEvaluation.id })
                        .then((evaluation) => {
                            if (evaluation) {
                                evaluation.status = allRowsSuccessful ? EvaluationStatus.COMPLETED : EvaluationStatus.ERROR
                                evaluation.average_metrics = JSON.stringify({
                                    averageLatency: (totalTime / result.rows.length).toFixed(3),
                                    totalRuns: result.rows.length,
                                    ...evalMetrics,
                                    passPcnt: passPercent.toFixed(2)
                                })
                                appServer.AppDataSource.getRepository(Evaluation).save(evaluation)
                            }
                        })
                } catch (error) {
                    //update the evaluation with status as error
                    appServer.AppDataSource.getRepository(Evaluation)
                        .findOneBy({ id: newEvaluation.id })
                        .then((evaluation) => {
                            if (evaluation) {
                                evaluation.status = EvaluationStatus.ERROR
                                appServer.AppDataSource.getRepository(Evaluation).save(evaluation)
                            }
                        })
                }
            })
            .catch((error) => {
                // Handle errors from runEvaluations
                console.error('Error running evaluations:', getErrorMessage(error))
                appServer.AppDataSource.getRepository(Evaluation)
                    .findOneBy({ id: newEvaluation.id })
                    .then((evaluation) => {
                        if (evaluation) {
                            evaluation.status = EvaluationStatus.ERROR
                            evaluation.average_metrics = JSON.stringify({
                                error: getErrorMessage(error)
                            })
                            appServer.AppDataSource.getRepository(Evaluation).save(evaluation)
                        }
                    })
                    .catch((dbError) => {
                        console.error('Error updating evaluation status:', getErrorMessage(dbError))
                    })
            })

        return getAllEvaluations(body.workspaceId)
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: EvalsService.createEvaluation - ${getErrorMessage(error)}`
        )
    }
}

const getAllEvaluations = async (workspaceId: string, page: number = -1, limit: number = -1) => {
    try {
        const appServer = getRunningExpressApp()

        // First, get the count of distinct evaluation names for the total
        // needed as the The getCount() method in TypeORM doesn't respect the GROUP BY clause and will return the total count of records
        const countQuery = appServer.AppDataSource.getRepository(Evaluation)
            .createQueryBuilder('ev')
            .select('COUNT(DISTINCT(ev.name))', 'count')
            .where('ev.workspaceId = :workspaceId', { workspaceId: workspaceId })

        const totalResult = await countQuery.getRawOne()
        const total = totalResult ? parseInt(totalResult.count) : 0

        // Then get the distinct evaluation names with their counts and latest run date
        const namesQueryBuilder = appServer.AppDataSource.getRepository(Evaluation)
            .createQueryBuilder('ev')
            .select('DISTINCT(ev.name)', 'name')
            .addSelect('COUNT(ev.name)', 'count')
            .addSelect('MAX(ev.runDate)', 'latestRunDate')
            .andWhere('ev.workspaceId = :workspaceId', { workspaceId: workspaceId })
            .groupBy('ev.name')
            .orderBy('max(ev.runDate)', 'DESC') // Order by the latest run date

        if (page > 0 && limit > 0) {
            namesQueryBuilder.skip((page - 1) * limit)
            namesQueryBuilder.take(limit)
        }

        const evaluationNames = await namesQueryBuilder.getRawMany()
        // Get all evaluations for all names at once in a single query
        const returnResults: IEvaluationResult[] = []

        if (evaluationNames.length > 0) {
            const names = evaluationNames.map((item) => item.name)
            // Fetch all evaluations for these names in a single query
            const allEvaluations = await appServer.AppDataSource.getRepository(Evaluation)
                .createQueryBuilder('ev')
                .where('ev.name IN (:...names)', { names })
                .andWhere('ev.workspaceId = :workspaceId', { workspaceId })
                .orderBy('ev.name', 'ASC')
                .addOrderBy('ev.runDate', 'DESC')
                .getMany()

            // Process the results by name
            const evaluationsByName = new Map<string, Evaluation[]>()
            // Group evaluations by name
            for (const evaluation of allEvaluations) {
                if (!evaluationsByName.has(evaluation.name)) {
                    evaluationsByName.set(evaluation.name, [])
                }
                evaluationsByName.get(evaluation.name)!.push(evaluation)
            }

            // Process each name's evaluations
            for (const item of evaluationNames) {
                const evaluationsForName = evaluationsByName.get(item.name) || []
                for (let i = 0; i < evaluationsForName.length; i++) {
                    const evaluation = evaluationsForName[i] as IEvaluationResult
                    evaluation.latestEval = i === 0
                    evaluation.version = parseInt(item.count) - i
                    returnResults.push(evaluation)
                }
            }
        }

        if (page > 0 && limit > 0) {
            return {
                total: total,
                data: returnResults
            }
        } else {
            return returnResults
        }
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: EvalsService.getAllEvaluations - ${getErrorMessage(error)}`
        )
    }
}

// Delete evaluation and all rows via id
const deleteEvaluation = async (id: string, activeWorkspaceId: string) => {
    try {
        const appServer = getRunningExpressApp()
        await appServer.AppDataSource.getRepository(Evaluation).delete({ id: id })
        await appServer.AppDataSource.getRepository(EvaluationRun).delete({ evaluationId: id })
        const results = await appServer.AppDataSource.getRepository(Evaluation).findBy(getWorkspaceSearchOptions(activeWorkspaceId))
        return results
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: EvalsService.deleteEvaluation - ${getErrorMessage(error)}`
        )
    }
}

// check for outdated evaluations
const isOutdated = async (id: string, workspaceId: string) => {
    try {
        const appServer = getRunningExpressApp()
        const evaluation = await appServer.AppDataSource.getRepository(Evaluation).findOneBy({
            id: id,
            workspaceId: workspaceId
        })
        if (!evaluation) throw new Error(`Evaluation ${id} not found`)
        const evaluationRunDate = evaluation.runDate.getTime()
        let isOutdated = false
        const returnObj: ICommonObject = {
            isOutdated: false,
            chatflows: [],
            dataset: '',
            errors: []
        }

        // check if the evaluation is outdated by extracting the runTime and then check with the dataset last updated time as well
        // as the chatflows last updated time. If the evaluation is outdated, then return true else return false
        const dataset = await appServer.AppDataSource.getRepository(Dataset).findOneBy({
            id: evaluation.datasetId,
            workspaceId: workspaceId
        })
        if (dataset) {
            const datasetLastUpdated = dataset.updatedDate.getTime()
            if (datasetLastUpdated > evaluationRunDate) {
                isOutdated = true
                returnObj.dataset = dataset
            }
        } else {
            returnObj.errors.push({
                message: `Dataset ${evaluation.datasetName} not found`,
                id: evaluation.datasetId
            })
            isOutdated = true
        }
        const chatflowIds = evaluation.chatflowId ? JSON.parse(evaluation.chatflowId) : []
        const chatflowNames = evaluation.chatflowName ? JSON.parse(evaluation.chatflowName) : []
        const chatflowTypes = evaluation.additionalConfig ? JSON.parse(evaluation.additionalConfig).chatflowTypes : []
        for (let i = 0; i < chatflowIds.length; i++) {
            // check for backward compatibility, as previous versions did not the types in additionalConfig
            if (chatflowTypes && chatflowTypes.length >= 0) {
                if (chatflowTypes[i] === 'Custom Assistant') {
                    // if the chatflow type is custom assistant, then we should NOT check in the chatflows table
                    continue
                }
            }
            const chatflow = await appServer.AppDataSource.getRepository(ChatFlow).findOneBy({
                id: chatflowIds[i],
                workspaceId: workspaceId
            })
            if (!chatflow) {
                returnObj.errors.push({
                    message: `Chatflow ${chatflowNames[i]} not found`,
                    id: chatflowIds[i]
                })
                isOutdated = true
            } else {
                const chatflowLastUpdated = chatflow.updatedDate.getTime()
                if (chatflowLastUpdated > evaluationRunDate) {
                    isOutdated = true
                    returnObj.chatflows.push({
                        chatflowName: chatflowNames[i],
                        chatflowId: chatflowIds[i],
                        chatflowType: chatflow.type === 'AGENTFLOW' ? 'Agentflow v2' : 'Chatflow',
                        isOutdated: true
                    })
                }
            }
        }
        if (chatflowTypes && chatflowTypes.length > 0) {
            for (let i = 0; i < chatflowIds.length; i++) {
                if (chatflowTypes[i] !== 'Custom Assistant') {
                    // if the chatflow type is NOT custom assistant, then bail out for this item
                    continue
                }
                const assistant = await appServer.AppDataSource.getRepository(Assistant).findOneBy({
                    id: chatflowIds[i],
                    workspaceId: workspaceId
                })
                if (!assistant) {
                    returnObj.errors.push({
                        message: `Custom Assistant ${chatflowNames[i]} not found`,
                        id: chatflowIds[i]
                    })
                    isOutdated = true
                } else {
                    const chatflowLastUpdated = assistant.updatedDate.getTime()
                    if (chatflowLastUpdated > evaluationRunDate) {
                        isOutdated = true
                        returnObj.chatflows.push({
                            chatflowName: chatflowNames[i],
                            chatflowId: chatflowIds[i],
                            chatflowType: 'Custom Assistant',
                            isOutdated: true
                        })
                    }
                }
            }
        }
        returnObj.isOutdated = isOutdated
        return returnObj
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: EvalsService.isOutdated - ${getErrorMessage(error)}`)
    }
}

const getEvaluation = async (id: string, workspaceId: string) => {
    try {
        const appServer = getRunningExpressApp()
        const evaluation = await appServer.AppDataSource.getRepository(Evaluation).findOneBy({
            id: id,
            workspaceId: workspaceId
        })
        if (!evaluation) throw new Error(`Evaluation ${id} not found`)
        const versionCount = await appServer.AppDataSource.getRepository(Evaluation).countBy({
            name: evaluation.name
        })
        const items = await appServer.AppDataSource.getRepository(EvaluationRun).find({
            where: { evaluationId: id }
        })
        const versions = (await getVersions(id, workspaceId)).versions
        const versionNo = versions.findIndex((version) => version.id === id) + 1
        return {
            ...evaluation,
            versionCount: versionCount,
            versionNo: versionNo,
            rows: items
        }
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: EvalsService.getEvaluation - ${getErrorMessage(error)}`)
    }
}

const getVersions = async (id: string, workspaceId: string) => {
    try {
        const appServer = getRunningExpressApp()
        const evaluation = await appServer.AppDataSource.getRepository(Evaluation).findOneBy({
            id: id,
            workspaceId: workspaceId
        })
        if (!evaluation) throw new Error(`Evaluation ${id} not found`)
        const versions = await appServer.AppDataSource.getRepository(Evaluation).find({
            where: {
                name: evaluation.name
            },
            order: {
                runDate: 'ASC'
            }
        })
        const returnResults: { id: string; runDate: Date; version: number }[] = []
        versions.map((version, index) => {
            returnResults.push({
                id: version.id,
                runDate: version.runDate,
                version: index + 1
            })
        })
        return {
            versions: returnResults
        }
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: EvalsService.getEvaluation - ${getErrorMessage(error)}`)
    }
}

const patchDeleteEvaluations = async (ids: string[] = [], activeWorkspaceId: string, isDeleteAllVersion?: boolean) => {
    try {
        const appServer = getRunningExpressApp()
        const evalsToBeDeleted = await appServer.AppDataSource.getRepository(Evaluation).find({
            where: {
                id: In(ids),
                workspaceId: activeWorkspaceId
            }
        })
        await appServer.AppDataSource.getRepository(Evaluation).delete(ids)
        for (const evaluation of evalsToBeDeleted) {
            await appServer.AppDataSource.getRepository(EvaluationRun).delete({ evaluationId: evaluation.id })
        }

        if (isDeleteAllVersion) {
            for (const evaluation of evalsToBeDeleted) {
                const otherVersionEvals = await appServer.AppDataSource.getRepository(Evaluation).find({
                    where: {
                        name: evaluation.name
                    }
                })
                if (otherVersionEvals.length > 0) {
                    await appServer.AppDataSource.getRepository(Evaluation).delete(
                        [...otherVersionEvals].map((evaluation) => evaluation.id)
                    )
                    for (const otherVersionEval of otherVersionEvals) {
                        await appServer.AppDataSource.getRepository(EvaluationRun).delete({ evaluationId: otherVersionEval.id })
                    }
                }
            }
        }

        const results = await appServer.AppDataSource.getRepository(Evaluation).findBy(getWorkspaceSearchOptions(activeWorkspaceId))
        return results
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: EvalsService.patchDeleteEvaluations - ${getErrorMessage(error)}`
        )
    }
}

export default {
    createEvaluation,
    getAllEvaluations,
    deleteEvaluation,
    getEvaluation,
    isOutdated,
    runAgain,
    getVersions,
    patchDeleteEvaluations
}
