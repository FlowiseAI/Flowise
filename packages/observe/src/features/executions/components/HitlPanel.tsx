import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    TextField,
    Typography
} from '@mui/material'

import type { HumanInputState } from '../hooks/useHumanInput'

interface HitlPanelProps {
    /**
     * Controls visibility of the floating Proceed/Reject bar. Driven by the
     * caller's gating logic (onHumanInput provided && node is humanInput &&
     * status is INPROGRESS). The feedback dialog and loading overlay render
     * regardless — they're scoped to `state.feedbackOpen` / `state.isSubmitting`,
     * which only flip when the bar has already been used.
     */
    show: boolean
    state: HumanInputState
}

/**
 * Floating Proceed/Reject bar + optional feedback dialog + submission overlay
 * for HITL nodes. Single mount in NodeExecutionDetail; submission lifecycle
 * lives in the `useHumanInput` hook.
 */
export function HitlPanel({ show, state }: HitlPanelProps) {
    const {
        isSubmitting,
        submitError,
        feedbackOpen,
        feedbackText,
        setFeedbackText,
        dismissError,
        handleProceed,
        handleReject,
        cancelFeedbackDialog,
        submitFeedback
    } = state

    return (
        <>
            {show && (
                <>
                    <Box
                        sx={{
                            position: 'fixed',
                            bottom: 15,
                            right: 25,
                            p: 1.5,
                            backgroundColor: 'background.paper',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                            borderRadius: '25px',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: 1,
                            zIndex: 1000
                        }}
                        data-testid='hitl-action-bar'
                    >
                        <Button
                            variant='outlined'
                            color='error'
                            sx={{ borderRadius: '25px' }}
                            disabled={isSubmitting}
                            onClick={handleReject}
                        >
                            Reject
                        </Button>
                        <Button
                            variant='contained'
                            color='primary'
                            sx={{ borderRadius: '25px' }}
                            disabled={isSubmitting}
                            onClick={handleProceed}
                        >
                            Proceed
                        </Button>
                    </Box>
                    {submitError && (
                        <Alert severity='error' sx={{ position: 'fixed', bottom: 80, right: 25, zIndex: 1000 }} onClose={dismissError}>
                            {submitError}
                        </Alert>
                    )}
                </>
            )}

            <Dialog open={feedbackOpen} onClose={cancelFeedbackDialog} maxWidth='sm' fullWidth>
                <DialogTitle>Provide Feedback</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        multiline
                        fullWidth
                        rows={3}
                        label='Feedback'
                        variant='outlined'
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        disabled={isSubmitting}
                        sx={{ mt: 1 }}
                        inputProps={{ 'aria-label': 'Feedback' }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={cancelFeedbackDialog} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button onClick={submitFeedback} variant='contained' disabled={isSubmitting}>
                        Submit
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={isSubmitting} aria-label='Submitting response'>
                <DialogContent>
                    <Stack direction='column' alignItems='center' spacing={2} sx={{ p: 2 }}>
                        <CircularProgress size={48} />
                        <Typography variant='body1'>Submitting response...</Typography>
                    </Stack>
                </DialogContent>
            </Dialog>
        </>
    )
}
