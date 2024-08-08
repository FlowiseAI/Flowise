'use client'
import React from 'react'
import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

import ExpandMoreIcon from '@mui/icons-material/ExpandLess'

import PromptCard from './PromptCard'
import { useAnswers } from './AnswersContext'
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
