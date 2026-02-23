import { createContext, ReactNode, useCallback, useContext, useState } from 'react'

import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material'

export interface ConfirmState {
    show: boolean
    title: string
    description: string
    confirmButtonName: string
    cancelButtonName: string
}

interface ConfirmContextValue {
    confirm: (payload: Partial<ConfirmState>) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

let resolveCallback: (value: boolean) => void

// TODO: Integrate with destructive actions (node deletion, canvas clear, discard unsaved changes)
/**
 * Hook to show confirmation dialogs
 * @example
 * const { confirm } = useConfirm()
 * const confirmed = await confirm({ title: 'Delete?', description: 'Are you sure?' })
 */
export function useConfirm(): ConfirmContextValue {
    const context = useContext(ConfirmContext)
    if (!context) {
        throw new Error('useConfirm must be used within a ConfirmProvider')
    }
    return context
}

export interface ConfirmProviderProps {
    children: ReactNode
}

/**
 * Provider component for confirmation dialogs
 */
export function ConfirmProvider({ children }: ConfirmProviderProps) {
    const [confirmState, setConfirmState] = useState<ConfirmState>({
        show: false,
        title: 'Confirm',
        description: '',
        confirmButtonName: 'Confirm',
        cancelButtonName: 'Cancel'
    })

    const closeConfirm = useCallback(() => {
        setConfirmState((prev) => ({ ...prev, show: false }))
    }, [])

    const onConfirm = useCallback(() => {
        closeConfirm()
        resolveCallback(true)
    }, [closeConfirm])

    const onCancel = useCallback(() => {
        closeConfirm()
        resolveCallback(false)
    }, [closeConfirm])

    const confirm = useCallback((payload: Partial<ConfirmState>): Promise<boolean> => {
        setConfirmState((prev) => ({
            ...prev,
            ...payload,
            show: true
        }))
        return new Promise((resolve) => {
            resolveCallback = resolve
        })
    }, [])

    return (
        <ConfirmContext.Provider value={{ confirm }}>
            {children}
            {confirmState.show && (
                <Dialog
                    fullWidth
                    maxWidth='xs'
                    open={confirmState.show}
                    onClose={onCancel}
                    aria-labelledby='confirm-dialog-title'
                    aria-describedby='confirm-dialog-description'
                >
                    <DialogTitle sx={{ fontSize: '1rem' }} id='confirm-dialog-title'>
                        {confirmState.title}
                    </DialogTitle>
                    <DialogContent>
                        <span>{confirmState.description}</span>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={onCancel}>{confirmState.cancelButtonName}</Button>
                        <Button variant='contained' onClick={onConfirm}>
                            {confirmState.confirmButtonName}
                        </Button>
                    </DialogActions>
                </Dialog>
            )}
        </ConfirmContext.Provider>
    )
}

export default ConfirmDialog

/**
 * Standalone confirm dialog component for portal-based rendering
 */
export function ConfirmDialog() {
    // This component is now handled by the ConfirmProvider
    // Kept for backwards compatibility
    return null
}
