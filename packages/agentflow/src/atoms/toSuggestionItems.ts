import type { SuggestionItem } from './SuggestionDropdown'
import type { VariableItem } from './VariablePicker'

/**
 * Convert VariableItem[] (from useAvailableVariables) to SuggestionItem[] for
 * TipTap mention autocomplete. Ensures unique ids by appending a counter suffix
 * when the same base id appears more than once.
 */
export function toSuggestionItems(variableItems: VariableItem[] | undefined): SuggestionItem[] | undefined {
    if (!variableItems || variableItems.length === 0) return undefined
    const idCount = new Map<string, number>()
    return variableItems.map((v) => {
        const baseId = v.value.replace(/{{|}}/g, '')
        const count = idCount.get(baseId) ?? 0
        idCount.set(baseId, count + 1)
        return {
            id: count === 0 ? baseId : `${baseId}__${count}`,
            label: v.label,
            description: v.description,
            category: v.category
        }
    })
}
