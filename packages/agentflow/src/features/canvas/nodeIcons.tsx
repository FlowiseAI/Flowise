import { IconBrandGoogle, IconBrowserCheck, IconCode, IconPhoto, IconWorldWww } from '@tabler/icons-react'

import { AGENTFLOW_ICONS } from '@/core'
import type { NodeData } from '@/core/types'

/**
 * Renders the icon for an agentflow node based on its name
 */
export function renderNodeIcon(node: NodeData) {
    const foundIcon = AGENTFLOW_ICONS.find((icon) => icon.name === node.name)
    if (!foundIcon) return null
    const IconComponent = foundIcon.icon
    return <IconComponent size={24} color='white' />
}

/**
 * Returns the icon component for OpenAI built-in tools
 */
export function getBuiltInOpenAIToolIcon(toolName: string) {
    switch (toolName) {
        case 'web_search_preview':
            return <IconWorldWww size={14} color='white' />
        case 'code_interpreter':
            return <IconCode size={14} color='white' />
        case 'image_generation':
            return <IconPhoto size={14} color='white' />
        default:
            return null
    }
}

/**
 * Returns the icon component for Gemini built-in tools
 */
export function getBuiltInGeminiToolIcon(toolName: string) {
    switch (toolName) {
        case 'urlContext':
            return <IconWorldWww size={14} color='white' />
        case 'googleSearch':
            return <IconBrandGoogle size={14} color='white' />
        case 'codeExecution':
            return <IconCode size={14} color='white' />
        default:
            return null
    }
}

/**
 * Returns the icon component for Anthropic built-in tools
 */
export function getBuiltInAnthropicToolIcon(toolName: string) {
    switch (toolName) {
        case 'web_search_20250305':
            return <IconWorldWww size={14} color='white' />
        case 'web_fetch_20250910':
            return <IconBrowserCheck size={14} color='white' />
        default:
            return null
    }
}
