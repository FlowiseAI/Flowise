import { useState } from 'react'

import { IconMessage } from '@tabler/icons-react'

import { useAgentflowContext } from '@/infrastructure/store'

import { StyledFab } from '../../node-palette/StyledFab'

export interface TestFlowButtonProps {
    /** Called when the dialog requests to be closed (e.g. after clearing chat) */
    onDialogClose?: () => void
}

/**
 * Floating action button that opens the test/chat dialog.
 * Only renders when the flow has been saved (chatflow.id is present).
 */
export function TestFlowButton({ onDialogClose }: TestFlowButtonProps) {
    const { state, clearExecutionState } = useAgentflowContext()
    const [open, setOpen] = useState(false)

    // Only show once the flow has been saved
    if (!state.chatflow?.id) return null

    const handleOpen = () => setOpen(true)

    const handleClose = () => {
        setOpen(false)
        clearExecutionState()
        onDialogClose?.()
    }

    return (
        <>
            <StyledFab size='small' color='secondary' aria-label='test flow' title='Test Flow' onClick={handleOpen}>
                <IconMessage />
            </StyledFab>

            {/* TestFlowDialog will be rendered here in Step 9 */}
            {open && (
                <div data-testid='test-flow-dialog-placeholder' style={{ display: 'none' }}>
                    {/* chatflowId={state.chatflow.id} onClose={handleClose} */}
                </div>
            )}
        </>
    )
}
