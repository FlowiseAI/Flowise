import { memo } from 'react'

import { Box, Button } from '@mui/material'

import { useConfigContext } from '@/infrastructure/store'

export interface Suggestion {
    text: string
    id?: string
}

export interface SuggestionChipsProps {
    /** List of suggestions to display */
    suggestions: Suggestion[]
    /** Callback when a suggestion is clicked */
    onSelect: (suggestion: Suggestion) => void
    /** Whether the chips are disabled */
    disabled?: boolean
}

const defaultSuggestions: Suggestion[] = [
    { id: '1', text: 'An agent that can autonomously search the web and generate report' },
    { id: '2', text: 'Summarize a document' },
    { id: '3', text: 'Generate response to user queries and send it to Slack' },
    { id: '4', text: 'A team of agents that can handle all customer queries' }
]

/**
 * Suggestion chips for the generate flow dialog
 */
function SuggestionChipsComponent({ suggestions = defaultSuggestions, onSelect, disabled = false }: SuggestionChipsProps) {
    const { isDarkMode } = useConfigContext()

    return (
        <Box
            sx={{
                display: 'block',
                flexDirection: 'row',
                width: '100%',
                mt: 3
            }}
        >
            {suggestions.map((suggestion, index) => (
                <Button
                    key={suggestion.id || index}
                    size='small'
                    disabled={disabled}
                    sx={{
                        textTransform: 'none',
                        mr: 1,
                        mb: 1,
                        borderRadius: '16px',
                        border: 'none',
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        '&:hover': {
                            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                            boxShadow: '0 4px 8px rgba(0,0,0,0.15)'
                        },
                        '&:disabled': {
                            opacity: 0.5
                        }
                    }}
                    variant='contained'
                    color='inherit'
                    onClick={() => onSelect(suggestion)}
                >
                    {suggestion.text}
                </Button>
            ))}
        </Box>
    )
}

export const SuggestionChips = memo(SuggestionChipsComponent)
export { defaultSuggestions }
export default SuggestionChips
