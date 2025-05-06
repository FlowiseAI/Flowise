'use client'

import PromptCard from './PromptCard'
import { StarterPrompt } from 'types'

interface DefaultPromptsProps {
    prompts?: StarterPrompt[]
    expanded?: boolean
    handleChange: (evt: any, expanded: boolean) => void
    onPromptSelected: (prompt: StarterPrompt) => void
}
export const DefaultPrompts = ({ prompts, onPromptSelected }: DefaultPromptsProps) => {
    const handlePromptClick = (prompt: StarterPrompt) => {
        onPromptSelected(prompt)
    }

    return prompts?.length
        ? prompts?.map((prompt) => <PromptCard key={prompt.prompt} {...prompt} onClick={() => handlePromptClick(prompt)} />)
        : null
}
