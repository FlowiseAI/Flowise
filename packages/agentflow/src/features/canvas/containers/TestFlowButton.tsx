import { useRef, useState } from 'react'

import { ClickAwayListener, Fade, Paper, Popper } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { IconArrowsMaximize, IconEraser, IconMessage, IconX } from '@tabler/icons-react'
import { v4 as uuidv4 } from 'uuid'

import { MainCard, StyledFab } from '@/atoms'
import { useAgentflowContext, useApiContext } from '@/infrastructure/store'

import { TestFlowDialog } from './TestFlowDialog'

export interface TestFlowButtonProps {
    onDialogClose?: () => void
    onOpenChange?: (open: boolean) => void
}

/**
 * Floating action button that opens the test/chat panel.
 * Only renders when the flow has been saved (chatflow.id is present).
 */
export function TestFlowButton({ onDialogClose, onOpenChange }: TestFlowButtonProps) {
    const theme = useTheme()
    const { state, clearExecutionState } = useAgentflowContext()
    const { chatflowsApi, executionsApi } = useApiContext()
    const [open, setOpen] = useState(false)
    const [clearKey, setClearKey] = useState(0)
    const [chatId, setChatId] = useState(() => uuidv4())
    const anchorRef = useRef<HTMLSpanElement>(null)

    const chatflowId = state.chatflow?.id
    if (!chatflowId) return null

    const handleToggle = () => {
        const next = !open
        setOpen(next)
        onOpenChange?.(next)
    }

    const handleClickAway = (event: MouseEvent | TouchEvent) => {
        if (anchorRef.current?.contains(event.target as Node)) return
        setOpen(false)
        onOpenChange?.(false)
        clearExecutionState()
        onDialogClose?.()
    }

    const handleClear = async () => {
        try {
            const page = await executionsApi.getAllExecutions({ agentflowId: chatflowId, sessionId: chatId })
            const ids = page.data.map((e) => e.id)
            await Promise.all([
                ids.length > 0 ? executionsApi.deleteExecutions(ids) : Promise.resolve(),
                chatflowsApi.deleteChatMessages(chatflowId, chatId)
            ])
        } catch {
            // best-effort: still reset the UI even if the server delete fails
        }
        setChatId(uuidv4())
        setClearKey((prev) => prev + 1)
        clearExecutionState()
    }

    return (
        <>
            {open && (
                <StyledFab size='small' color='primary' aria-label='expand' title='Expand Chat'>
                    <IconArrowsMaximize />
                </StyledFab>
            )}
            {open && (
                <StyledFab size='small' color='error' aria-label='clear' title='Clear Chat' onClick={() => void handleClear()}>
                    <IconEraser />
                </StyledFab>
            )}
            <span ref={anchorRef} style={{ display: 'inline-flex' }}>
                <StyledFab size='small' color='secondary' aria-label='test flow' title='Test Flow' onClick={handleToggle}>
                    {open ? <IconX /> : <IconMessage />}
                </StyledFab>
            </span>

            <Popper
                placement='bottom-end'
                open={open}
                anchorEl={anchorRef.current}
                role={undefined}
                transition
                popperOptions={{
                    modifiers: [{ name: 'offset', options: { offset: [40, 14] } }]
                }}
                sx={{ zIndex: 1000 }}
            >
                {({ TransitionProps }) => (
                    <Fade {...TransitionProps}>
                        <Paper>
                            <ClickAwayListener onClickAway={handleClickAway}>
                                <MainCard
                                    border={false}
                                    content={false}
                                    boxShadow
                                    shadow={theme.shadows[16]}
                                    sx={{ width: 400, height: 'calc(100vh - 180px)', bgcolor: 'background.paper' }}
                                >
                                    <TestFlowDialog
                                        key={clearKey}
                                        chatflowId={chatflowId}
                                        open={open}
                                        chatId={chatId}
                                        onChatIdChange={setChatId}
                                    />
                                </MainCard>
                            </ClickAwayListener>
                        </Paper>
                    </Fade>
                )}
            </Popper>
        </>
    )
}
