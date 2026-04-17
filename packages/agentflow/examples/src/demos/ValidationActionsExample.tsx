/**
 * Canvas Actions Example
 *
 * Demonstrates how to add custom FAB buttons alongside the built-in validation
 * button in the top-right canvas overlay using the `canvasActions` prop.
 *
 * Mirrors the legacy v2 pattern where a chat FAB and validation FAB sit side-by-side.
 */

import { useState } from 'react'

import { Agentflow } from '@flowiseai/agentflow'
import { Box, Dialog, DialogContent, DialogTitle, Fab, IconButton, Typography } from '@mui/material'
import { IconMessage, IconX } from '@tabler/icons-react'

import { apiBaseUrl, token } from '../config'

function ChatFab() {
    const [open, setOpen] = useState(false)

    return (
        <>
            <Fab
                size='small'
                aria-label='chat'
                title='Chat'
                onClick={() => setOpen(true)}
                sx={{
                    color: 'white',
                    backgroundColor: 'secondary.main',
                    '&:hover': {
                        backgroundColor: 'secondary.main',
                        backgroundImage: 'linear-gradient(rgb(0 0 0/10%) 0 0)'
                    }
                }}
            >
                <IconMessage />
            </Fab>

            <Dialog open={open} onClose={() => setOpen(false)} maxWidth='sm' fullWidth>
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Chat
                    <IconButton size='small' onClick={() => setOpen(false)}>
                        <IconX size={18} />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                        <Typography variant='body2' color='text.secondary'>
                            Your chat UI goes here. Full control — bring any component.
                        </Typography>
                    </Box>
                </DialogContent>
            </Dialog>
        </>
    )
}

export function ValidationActionsExample() {
    return (
        <div style={{ width: '100%', height: '100%' }}>
            <Agentflow apiBaseUrl={apiBaseUrl} token={token ?? undefined} canvasActions={<ChatFab />} />
        </div>
    )
}

export const ValidationActionsExampleProps = {
    apiBaseUrl: '{from environment variables}',
    token: '{from environment variables}',
    canvasActions: '<ChatFab />'
}
