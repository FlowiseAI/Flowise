import { useRef, useState } from 'react'

import { ClickAwayListener, Fade, Paper, Popper } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { IconArrowsMaximize, IconEraser, IconMessage, IconX } from '@tabler/icons-react'

import { MainCard, StyledFab } from '@/atoms'
import { useAgentflowContext } from '@/infrastructure/store'

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
    const [open, setOpen] = useState(false)
    const [clearKey, setClearKey] = useState(0)
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

    const handleClear = () => {
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
                <StyledFab size='small' color='error' aria-label='clear' title='Clear Chat' onClick={handleClear}>
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
                                    <TestFlowDialog key={clearKey} chatflowId={chatflowId} open={open} />
                                </MainCard>
                            </ClickAwayListener>
                        </Paper>
                    </Fade>
                )}
            </Popper>
        </>
    )
}
