import toSentenceCase from '@utils/utilities/toSentenceCase'
import { renderTemplate } from '@utils/utilities/renderTemplate'
import { Sidekick, SidekickListItem, User } from 'types'

export const normalizeSidekickListItem = (sidekick: Sidekick, user?: User): SidekickListItem => {
    let sharedWith = 'private'
    switch (true) {
        case sidekick.isGlobal:
            sharedWith = 'global'
            break

        case sidekick.isSharedWithOrg:
            sharedWith = 'org'
            break

        case sidekick.isSystem:
            sharedWith = 'system'
            break
    }

    const hasFavorited = sidekick?.favoritedBy?.some((u) => u.id === user?.id) ?? false

    const sidekickListItem: SidekickListItem = {
        placeholder: sidekick.placeholder || '',
        tagString: (sidekick.tags || []).map((t) => toSentenceCase(t)).join(', '),
        tags: (sidekick.tags || []).map((t) => toSentenceCase(t)),
        id: sidekick.id || '',
        aiModel: sidekick.aiModel || '',
        label: sidekick.label || '',
        sharedWith: sharedWith,
        isFavorite: hasFavorited,
        chatflow: sidekick.chatflow,
        answersConfig: sidekick.chatflow?.answersConfig,
        chatflowId: sidekick.chatflow?.id || '',
        chatflowDomain: sidekick.chatflowDomain,
        chatbotConfig: parseChatbotConfig(sidekick.chatflow?.chatbotConfig),
        flowData: parseFlowData(sidekick.chatflow?.flowData)
    }

    return sidekickListItem
}

export function parseObjectRecursively(obj: any): any {
    if (Array.isArray(obj)) {
        // If it's an array, parse each element
        return obj.map(parseObjectRecursively)
    } else if (typeof obj === 'object' && obj !== null) {
        // Check if the object has only numeric keys and therefore should be treated as an array
        const keys = Object.keys(obj)
        const isNumericKeys = keys.every((key) => !isNaN(Number(key)))
        if (isNumericKeys && keys.length > 0) {
            // Convert object to array if all keys are numeric
            return keys.map((key) => parseObjectRecursively(obj[key]))
        } else {
            // Otherwise, parse each property of the object
            const newObj: any = {}
            for (const key of keys) {
                newObj[key] = parseObjectRecursively(obj[key])
            }
            return newObj
        }
    }

    // Return the value unchanged if it's not an array or object
    return obj
}

// Function to parse the 'chatbotConfig' JSON string using the generic parsing approach

export const parseFlowData = (flowDataJson: string): FlowData => parseObjectRecursively(JSON.parse(flowDataJson)) as FlowData

export function parseChatbotConfig(chatbotConfigJson?: string): ChatbotConfig | null {
    if (!chatbotConfigJson) return null
    const parsedObj = JSON.parse(chatbotConfigJson)
    return parseObjectRecursively(parsedObj) as ChatbotConfig
}

export function parseAnswersConfig(answersConfigJson?: string): AnswersConfig | null {
    if (!answersConfigJson) return null
    const parsedObj = JSON.parse(answersConfigJson)
    return parseObjectRecursively(parsedObj) as AnswersConfig
}

export const normalizeSidekickList = (sidekicks: Partial<Sidekick>[], user?: User): SidekickListItem[] => {
    const normalizedSidekicks: SidekickListItem[] = sidekicks.map((sidekick) => normalizeSidekickListItem(sidekick, user))

    return normalizedSidekicks
}

//TODO: Update if we don't want to return all fields
export const normalizeSidekickItem = (sidekick: Sidekick): Sidekick => {
    return sidekick
}

//TODO: Update if we don't want to return all fields
export const normalizeSidekickForUpdate = (sidekick: Sidekick): Sidekick => {
    const { temperature, frequency, presence, maxCompletionTokens, sharedWith, ...data } = sidekick

    const isSystem = sharedWith === 'system'
    const isGlobal = !isSystem && sharedWith === 'global'
    const isSharedWithOrg = !isSystem && sharedWith === 'org'

    const normalizedSidekick: Sidekick = {
        ...data,
        temperature: Number(temperature),
        frequency: Number(frequency),
        presence: Number(presence),
        maxCompletionTokens: Number(maxCompletionTokens),
        isSystem,
        isGlobal,
        isSharedWithOrg
    }

    // Validate handlebars template
    try {
        const prompt = renderTemplate(normalizedSidekick.systemPromptTemplate, {})
    } catch (err) {
        console.log(err)
        throw new Error('InvalidSystemPromptTemplate')
    }
    try {
        const prompt = renderTemplate(normalizedSidekick.userPromptTemplate, {})
    } catch (err) {
        console.log(err)
        throw new Error('InvalidUserPromptTemplate')
    }
    try {
        const prompt = renderTemplate(normalizedSidekick.contextStringRender, {})
    } catch (err) {
        console.log(err)
        throw new Error('InvalidContextRenderTemplate')
    }

    return normalizedSidekick
}
