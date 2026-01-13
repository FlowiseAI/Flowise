import { DataSource, In } from 'typeorm'
import { ChatFlow } from '../database/entities/ChatFlow'
import { ChatFlowVersion } from '../database/entities/ChatFlowVersion'
import { getRunningExpressApp } from './getRunningExpressApp'

/**
 * Merges active version data into a single chatflow object
 * @param chatflow - The chatflow entity to merge version data into
 * @param activeVersion - The active version entity (optional)
 */
export const mergeActiveVersionData = (chatflow: ChatFlow, activeVersion: ChatFlowVersion | null): void => {
    if (!activeVersion) return

    chatflow.flowData = activeVersion.flowData
    if (activeVersion.apikeyid !== undefined) chatflow.apikeyid = activeVersion.apikeyid
    if (activeVersion.chatbotConfig !== undefined) chatflow.chatbotConfig = activeVersion.chatbotConfig
    if (activeVersion.apiConfig !== undefined) chatflow.apiConfig = activeVersion.apiConfig
    if (activeVersion.analytic !== undefined) chatflow.analytic = activeVersion.analytic
    if (activeVersion.speechToText !== undefined) chatflow.speechToText = activeVersion.speechToText
    if (activeVersion.textToSpeech !== undefined) chatflow.textToSpeech = activeVersion.textToSpeech
    if (activeVersion.followUpPrompts !== undefined) chatflow.followUpPrompts = activeVersion.followUpPrompts
}

/**
 * Fetches the active version for a chatflow and merges its data
 * @param chatflow - The chatflow entity to merge version data into
 * @param dataSource - Optional DataSource to use (for initialization before app is ready)
 * @returns The chatflow with merged active version data
 */
export const fetchAndMergeActiveVersion = async (chatflow: ChatFlow, dataSource?: DataSource): Promise<ChatFlow> => {
    const ds = dataSource || getRunningExpressApp().AppDataSource
    const activeVersion = await ds.getRepository(ChatFlowVersion).findOne({
        where: { masterId: chatflow.id, isActive: true }
    })
    mergeActiveVersionData(chatflow, activeVersion)
    return chatflow
}

/**
 * Fetches active versions for multiple chatflows and merges their data (batch operation)
 * @param chatflows - Array of chatflow entities to merge version data into
 * @param dataSource - Optional DataSource to use (for initialization before app is ready)
 * @returns The chatflows with merged active version data
 */
export const fetchAndMergeActiveVersionsBatch = async (chatflows: ChatFlow[], dataSource?: DataSource): Promise<ChatFlow[]> => {
    if (chatflows.length === 0) return chatflows

    const ds = dataSource || getRunningExpressApp().AppDataSource
    const chatflowIds = chatflows.map((cf) => cf.id)

    const activeVersions = await ds.getRepository(ChatFlowVersion).find({
        where: { masterId: In(chatflowIds), isActive: true }
    })

    const versionMap = new Map(activeVersions.map((v) => [v.masterId, v]))

    for (const chatflow of chatflows) {
        const activeVersion = versionMap.get(chatflow.id)
        if (activeVersion) {
            mergeActiveVersionData(chatflow, activeVersion)
        }
    }

    return chatflows
}
