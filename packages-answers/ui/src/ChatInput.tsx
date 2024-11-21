'use client'
import React, { useState, useEffect, useRef, ChangeEvent } from 'react'

import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import type { SelectChangeEvent } from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import AddIcon from '@mui/icons-material/Add'
import Tooltip from '@mui/material/Tooltip'

import { useAnswers } from './AnswersContext'
// import Fieldset from './Fieldset';

import { throttle } from '@utils/throttle'

import type { Sidekick, StarterPrompt } from 'types'
import { DefaultPrompts } from './DefaultPrompts'
// import { RemainingTokensCounter } from './RemainingTokensCounter';
// import { useUserPlans } from './hooks/useUserPlan';

const ChatInput = ({ scrollRef, isWidget, sidekicks = [] }: { scrollRef?: any; isWidget?: boolean; sidekicks?: Sidekick[] }) => {
    const defaultPlaceholderValue = 'How can you help me accomplish my goal?'
    const [inputValue, setInputValue] = useState('')
    const [placeholder, setPlaceholder] = useState(defaultPlaceholderValue)

    // const { activeUserPlan } = useUserPlans();

    const { chat, journey, messages, sendMessage, isLoading, sidekick, setSidekick, gptModel, setGptModel, startNewChat, chatbotConfig } =
        useAnswers()

    const inputRef = useRef<HTMLInputElement>(null)

    const throttledScroll = React.useCallback(
        throttle(() => {
            scrollRef?.current?.scrollTo({ top: scrollRef.current.scrollHeight })
        }, 300),
        [scrollRef]
    )
    useEffect(() => {
        if (messages?.length && isLoading) throttledScroll()
    }, [chat, journey, messages, scrollRef])

    const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
        setInputValue(event.target.value)
    }

    const handleSubmit = () => {
        if (!inputValue) return
        sendMessage({ content: inputValue, sidekick, gptModel })
        setInputValue('')
    }
    const handlePromptSelected = (prompt: StarterPrompt) => {
        sendMessage({ content: prompt.prompt, sidekick, gptModel })
        setInputValue('')
    }

    const handleGptModelSelected = (event: SelectChangeEvent<string>) => {
        setGptModel(event.target.value as string)
    }

    const handleKeyPress = (e: any) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            handleSubmit()
            e.preventDefault()
            e.stopPropagation()
            return false
        }
    }

    const handleAbort = async () => {
        setIsMessageStopping(true)
        try {
            // Need to implement abort functionality in AnswersContext
            await abortMessage(chat?.id)
            setIsMessageStopping(false)
        } catch (error) {
            setIsMessageStopping(false)
            // Handle error
        }
    }

    const onSourceDialogClick = (data: any, title: string) => {
        setSourceDialogProps({ data, title })
        setSourceDialogOpen(true)
    }

    return (
        <Box display='flex' position='relative' sx={{ gap: 1, flexDirection: 'column', pb: 2, px: 2 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', alignItems: 'flex-end' }}>
                    {/* <SidekickSelect onSidekickSelected={handleSidekickSelected} sidekicks={sidekicks} /> */}
                    {!messages?.length ? (
                        <DefaultPrompts prompts={chatbotConfig?.starterPrompts} onPromptSelected={handlePromptSelected} />
                    ) : null}
                </Box>
                {/* <RemainingTokensCounter /> */}
            </Box>

            <TextField
                id='user-chat-input'
                inputRef={inputRef}
                sx={(theme) => ({
                    textarea: {
                        height: 23,
                        paddingRight: 4,
                        paddingBottom: 5,
                        maxHeight: theme.spacing(8),
                        overflowY: 'auto!important'
                    }
                })}
                variant='filled'
                fullWidth
                placeholder={chatbotConfig?.textInput?.placeholder ?? 'Send a question or task'}
                value={inputValue}
                multiline
                // disabled={!activeUserPlan || activeUserPlan.tokensLeft <= 0}
                onKeyPress={handleKeyPress}
                onChange={handleInputChange}
            />

            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    position: 'absolute',
                    gap: 1,
                    bottom: 28,
                    right: 28
                }}
            >
                {!isWidget && messages?.length ? (
                    <Tooltip title='Start new chat'>
                        <Button variant='outlined' color='primary' onClick={() => startNewChat()} data-test-id='new-chat-button'>
                            <AddIcon />
                        </Button>
                    </Tooltip>
                ) : null}

                <Button
                    variant='contained'
                    color='primary'
                    onClick={handleSubmit}
                    // disabled={!inputValue || isLoading}
                >
                    Send
                </Button>
            </Box>
        </Box>
    )
}

export default ChatInput
