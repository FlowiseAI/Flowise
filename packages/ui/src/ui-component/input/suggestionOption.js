import { ReactRenderer } from '@tiptap/react'
import tippy from 'tippy.js'
import SuggestionList from './SuggestionList'
import variablesApi from '@/api/variables'

/**
 * Workaround for the current typing incompatibility between Tippy.js and Tiptap
 * Suggestion utility.
 *
 * @see https://github.com/ueberdosis/tiptap/issues/2795#issuecomment-1160623792
 *
 * Adopted from
 * https://github.com/Doist/typist/blob/a1726a6be089e3e1452def641dfcfc622ac3e942/stories/typist-editor/constants/suggestions.ts#L169-L186
 */
const DOM_RECT_FALLBACK = {
    bottom: 0,
    height: 0,
    left: 0,
    right: 0,
    top: 0,
    width: 0,
    x: 0,
    y: 0,
    toJSON() {
        return {}
    }
}

// Cache for storing variables
let cachedVariables = []

// Function to fetch variables
const fetchVariables = async () => {
    try {
        const response = await variablesApi.getAllVariables()
        cachedVariables = response.data || []
        return cachedVariables
    } catch (error) {
        console.error('Failed to fetch variables:', error)
        return []
    }
}

export const suggestionOptions = (
    availableNodesForVariable,
    availableState,
    acceptNodeOutputAsVariable,
    nodes,
    nodeData,
    isNodeInsideInteration
) => ({
    char: '{{',
    items: async ({ query }) => {
        const defaultItems = [
            { id: 'question', mentionLabel: 'question', description: "User's question from chatbox", category: 'Chat Context' },
            {
                id: 'chat_history',
                mentionLabel: 'chat_history',
                description: 'Past conversation history between user and AI',
                category: 'Chat Context'
            },
            {
                id: 'current_date_time',
                mentionLabel: 'current_date_time',
                description: 'Current date and time',
                category: 'Chat Context'
            },
            {
                id: 'runtime_messages_length',
                mentionLabel: 'runtime_messages_length',
                description: 'Total messsages between LLM and Agent',
                category: 'Chat Context'
            },
            {
                id: 'loop_count',
                mentionLabel: 'loop_count',
                description: 'Current loop count',
                category: 'Chat Context'
            },
            {
                id: 'file_attachment',
                mentionLabel: 'file_attachment',
                description: 'Files uploaded from the chat',
                category: 'Chat Context'
            },
            { id: '$flow.sessionId', mentionLabel: '$flow.sessionId', description: 'Current session ID', category: 'Flow Variables' },
            { id: '$flow.chatId', mentionLabel: '$flow.chatId', description: 'Current chat ID', category: 'Flow Variables' },
            { id: '$flow.chatflowId', mentionLabel: '$flow.chatflowId', description: 'Current chatflow ID', category: 'Flow Variables' }
        ]

        const stateItems = (availableState || []).map((state) => ({
            id: `$flow.state.${state.key}`,
            mentionLabel: `$flow.state.${state.key}`,
            category: 'Flow State'
        }))

        if (isNodeInsideInteration) {
            defaultItems.unshift({
                id: '$iteration',
                mentionLabel: '$iteration',
                description: 'Iteration item. For JSON, use dot notation: $iteration.name',
                category: 'Iteration'
            })
        }

        // Add output option if acceptNodeOutputAsVariable is true
        if (acceptNodeOutputAsVariable) {
            defaultItems.unshift({
                id: 'output',
                mentionLabel: 'output',
                description: 'Output from the current node',
                category: 'Node Outputs'
            })

            const structuredOutputs = nodeData?.inputs?.llmStructuredOutput ?? []
            if (structuredOutputs && structuredOutputs.length > 0) {
                structuredOutputs.forEach((item) => {
                    defaultItems.unshift({
                        id: `output.${item.key}`,
                        mentionLabel: `output.${item.key}`,
                        description: `${item.description}`,
                        category: 'Node Outputs'
                    })
                })
            }
        }

        // Fetch variables if cache is empty
        if (cachedVariables.length === 0) {
            await fetchVariables()
        }

        const variableItems = cachedVariables.map((variable) => ({
            id: `$vars.${variable.name}`,
            mentionLabel: `$vars.${variable.name}`,
            description: `Variable: ${variable.value} (${variable.type})`,
            category: 'Custom Variables'
        }))

        const startAgentflowNode = nodes.find((node) => node.data.name === 'startAgentflow')
        const formInputTypes = startAgentflowNode?.data?.inputs?.formInputTypes

        let formItems = []
        if (formInputTypes) {
            formItems = (formInputTypes || []).map((input) => ({
                id: `$form.${input.name}`,
                mentionLabel: `$form.${input.name}`,
                description: `Form Input: ${input.label}`,
                category: 'Form Inputs'
            }))
        }

        const nodeItems = (availableNodesForVariable || []).map((node) => {
            const selectedOutputAnchor = node.data.outputAnchors?.[0]?.options?.find((ancr) => ancr.name === node.data.outputs['output'])

            return {
                id: `${node.id}`,
                mentionLabel: node.data.inputs.chainName ?? node.data.inputs.functionName ?? node.data.inputs.variableName ?? node.data.id,
                description:
                    node.data.name === 'ifElseFunction'
                        ? node.data.description
                        : `${selectedOutputAnchor?.label ?? 'Output'} from ${node.data.label}`,
                category: 'Node Outputs'
            }
        })

        const allItems = [...defaultItems, ...formItems, ...nodeItems, ...stateItems, ...variableItems]

        return allItems.filter(
            (item) => item.mentionLabel.toLowerCase().includes(query.toLowerCase()) || item.id.toLowerCase().includes(query.toLowerCase())
        )
    },
    render: () => {
        let component
        let popup

        return {
            onStart: (props) => {
                component = new ReactRenderer(SuggestionList, {
                    props,
                    editor: props.editor
                })

                popup = tippy('body', {
                    getReferenceClientRect: () => props.clientRect?.() ?? DOM_RECT_FALLBACK,
                    appendTo: () => document.body,
                    content: component.element,
                    showOnCreate: true,
                    interactive: true,
                    trigger: 'manual',
                    placement: 'bottom-start'
                })[0]
            },

            onUpdate(props) {
                component?.updateProps(props)

                popup?.setProps({
                    getReferenceClientRect: () => props.clientRect?.() ?? DOM_RECT_FALLBACK
                })
            },

            onKeyDown(props) {
                if (props.event.key === 'Escape') {
                    popup?.hide()
                    return true
                }

                if (!component?.ref) {
                    return false
                }

                return component.ref.onKeyDown(props)
            },

            onExit() {
                popup?.destroy()
                component?.destroy()

                // Remove references to the old popup and component upon destruction/exit.
                // (This should prevent redundant calls to `popup.destroy()`, which Tippy
                // warns in the console is a sign of a memory leak, as the `suggestion`
                // plugin seems to call `onExit` both when a suggestion menu is closed after
                // a user chooses an option, *and* when the editor itself is destroyed.)
                popup = undefined
                component = undefined
            }
        }
    }
})

// Export function to refresh variables cache
export const refreshVariablesCache = () => {
    return fetchVariables()
}
