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
import { calculateCost } from './CostCalculator'
import { runAdditionalEvaluators } from './EvaluatorRunner'
import evaluatorsService from '../evaluator'
import { LLMEvaluationRunner } from './LLMEvaluationRunner'

const runAgain = async (id: string, baseURL: string, orgId: string) => {
    try {
        const appServer = getRunningExpressApp()
        const evaluation = await appServer.AppDataSource.getRepository(Evaluation).findOneBy({
            id: id
        })
        if (!evaluation) throw new Error(`Evaluation ${id} not found`)
        const additionalConfig: any = JSON.parse(evaluation.additionalConfig)
        const data: ICommonObject = {
            chatflowId: evaluation.chatflowId,
            chatflowName: evaluation.chatflowName,
            datasetName: evaluation.datasetName,
            datasetId: evaluation.datasetId,
            evaluationType: evaluation.evaluationType,
            selectedSimpleEvaluators: JSON.stringify(additionalConfig.simpleEvaluators),
            datasetAsOneConversation: additionalConfig.datasetAsOneConversation
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
        return await createEvaluation(data, baseURL, orgId)
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: EvalsService.runAgain - ${getErrorMessage(error)}`)
    }
}

const createEvaluation = async (body: ICommonObject, baseURL: string, orgId: string) => {
    try {
        const appServer = getRunningExpressApp()
        const newEval = new Evaluation()
        Object.assign(newEval, body)
        newEval.status = EvaluationStatus.PENDING

        const row = appServer.AppDataSource.getRepository(Evaluation).create(newEval)
        row.average_metrics = JSON.stringify({})

        const additionalConfig: any = {
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
            id: body.datasetId
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
                id: chatflowId
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
            .then(async (result: any) => {
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

                            const metrics = evaluationRow.metrics
                            if (metrics) {
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
                            body.selectedSimpleEvaluators.length > 0 ? JSON.parse(body.selectedSimpleEvaluators) : []
                        )

                        newRun.evaluators = JSON.stringify(results)
                        evalMetrics.passCount += evaluatorMetrics.passCount
                        evalMetrics.failCount += evaluatorMetrics.failCount
                        evalMetrics.errorCount += evaluatorMetrics.errorCount

                        if (body.evaluationType === 'llm') {
                            resultRow.llmConfig = additionalConfig.llmConfig
                            resultRow.LLMEvaluators = body.selectedLLMEvaluators.length > 0 ? JSON.parse(body.selectedLLMEvaluators) : []
                            const llmEvaluatorMap: any = []
                            for (let i = 0; i < resultRow.LLMEvaluators.length; i++) {
                                const evaluatorId = resultRow.LLMEvaluators[i]
                                const evaluator = await evaluatorsService.getEvaluator(evaluatorId)
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
                        .then((evaluation: any) => {
                            evaluation.status = allRowsSuccessful ? EvaluationStatus.COMPLETED : EvaluationStatus.ERROR
                            evaluation.average_metrics = JSON.stringify({
                                averageLatency: (totalTime / result.rows.length).toFixed(3),
                                totalRuns: result.rows.length,
                                ...evalMetrics,
                                passPcnt: passPercent.toFixed(2)
                            })
                            appServer.AppDataSource.getRepository(Evaluation).save(evaluation)
                        })
                } catch (error) {
                    //update the evaluation with status as error
                    appServer.AppDataSource.getRepository(Evaluation)
                        .findOneBy({ id: newEvaluation.id })
                        .then((evaluation: any) => {
                            evaluation.status = EvaluationStatus.ERROR
                            appServer.AppDataSource.getRepository(Evaluation).save(evaluation)
                        })
                }
            })
            .catch((error) => {
                // Handle errors from runEvaluations
                console.error('Error running evaluations:', getErrorMessage(error))
                appServer.AppDataSource.getRepository(Evaluation)
                    .findOneBy({ id: newEvaluation.id })
                    .then((evaluation: any) => {
                        evaluation.status = EvaluationStatus.ERROR
                        evaluation.average_metrics = JSON.stringify({
                            error: getErrorMessage(error)
                        })
                        appServer.AppDataSource.getRepository(Evaluation).save(evaluation)
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

const getAllEvaluations = async (workspaceId?: string) => {
    try {
        const appServer = getRunningExpressApp()
        const findAndOrderBy: any = {
            where: getWorkspaceSearchOptions(workspaceId),
            order: {
                runDate: 'DESC'
            }
        }
        const evaluations = await appServer.AppDataSource.getRepository(Evaluation).find(findAndOrderBy)

        const returnResults: IEvaluationResult[] = []
        // mark the first evaluation with a unique name as the latestEval and then reset the version number
        for (let i = 0; i < evaluations.length; i++) {
            const evaluation = evaluations[i] as IEvaluationResult
            returnResults.push(evaluation)
            // find the first index with this name in the evaluations array
            // as it is sorted desc, make the first evaluation with this name as the latestEval
            const currentIndex = evaluations.indexOf(evaluation)
            if (evaluations.findIndex((e) => e.name === evaluation.name) === currentIndex) {
                returnResults[i].latestEval = true
            }
        }

        for (let i = 0; i < returnResults.length; i++) {
            const evaluation = returnResults[i]
            if (evaluation.latestEval) {
                const versions = returnResults.filter((e) => e.name === evaluation.name)
                let descVersion = versions.length
                for (let j = 0; j < versions.length; j++) {
                    versions[j].version = descVersion--
                }
            }
        }

        return returnResults
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: EvalsService.getAllEvaluations - ${getErrorMessage(error)}`
        )
    }
}

// Delete evaluation and all rows via id
const deleteEvaluation = async (id: string, activeWorkspaceId?: string) => {
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
const isOutdated = async (id: string) => {
    try {
        const appServer = getRunningExpressApp()
        const evaluation = await appServer.AppDataSource.getRepository(Evaluation).findOneBy({
            id: id
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
            id: evaluation.datasetId
        })
        if (dataset) {
            const datasetLastUpdated = dataset.updatedDate.getTime()
            if (datasetLastUpdated > evaluationRunDate) {
                isOutdated = true
                returnObj.dataset = dataset
            }
        } else {
            returnObj.errors.push(`Dataset ${evaluation.datasetName} not found`)
            isOutdated = true
        }
        const chatflows = JSON.parse(evaluation.chatflowId)
        const chatflowNames = JSON.parse(evaluation.chatflowName)

        for (let i = 0; i < chatflows.length; i++) {
            const chatflow = await appServer.AppDataSource.getRepository(ChatFlow).findOneBy({
                id: chatflows[i]
            })
            if (!chatflow) {
                returnObj.errors.push(`Chatflow ${chatflowNames[i]} not found`)
                isOutdated = true
            } else {
                const chatflowLastUpdated = chatflow.updatedDate.getTime()
                if (chatflowLastUpdated > evaluationRunDate) {
                    isOutdated = true
                    returnObj.chatflows.push({
                        chatflowName: chatflowNames[i],
                        chatflowId: chatflows[i],
                        isOutdated: true
                    })
                }
            }
        }
        returnObj.isOutdated = isOutdated
        return returnObj
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: EvalsService.isOutdated - ${getErrorMessage(error)}`)
    }
}

const getEvaluation = async (id: string) => {
    try {
        const appServer = getRunningExpressApp()
        const evaluation = await appServer.AppDataSource.getRepository(Evaluation).findOneBy({
            id: id
        })
        if (!evaluation) throw new Error(`Evaluation ${id} not found`)
        const versionCount = await appServer.AppDataSource.getRepository(Evaluation).countBy({
            name: evaluation.name
        })
        const items = await appServer.AppDataSource.getRepository(EvaluationRun).find({
            where: { evaluationId: id }
        })
        const versions = (await getVersions(id)).versions
        const versionNo = versions.findIndex((version: any) => version.id === id) + 1
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

const getVersions = async (id: string) => {
    try {
        const appServer = getRunningExpressApp()
        const evaluation = await appServer.AppDataSource.getRepository(Evaluation).findOneBy({
            id: id
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
        const returnResults: any[] = []
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

const patchDeleteEvaluations = async (ids: string[] = [], isDeleteAllVersion?: boolean, activeWorkspaceId?: string) => {
    try {
        const appServer = getRunningExpressApp()
        const evalsToBeDeleted = await appServer.AppDataSource.getRepository(Evaluation).find({
            where: {
                id: In(ids)
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
