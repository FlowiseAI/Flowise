'use client'
import React, { createContext, useContext, useState } from 'react'
import dynamic from 'next/dynamic'

const PurchaseSubscription = dynamic(() => import('./billing/PurchaseSubscription'), { ssr: false })
const Dialog = dynamic(() => import('@mui/material/Dialog'), { ssr: false })
const DialogContent = dynamic(() => import('@mui/material/DialogContent'), { ssr: false })
const DialogTitle = dynamic(() => import('@mui/material/DialogTitle'), { ssr: false })

interface SubscriptionDialogContextType {
    open: boolean
    openDialog: () => void
    closeDialog: () => void
}

const SubscriptionDialogContext = createContext<SubscriptionDialogContextType>({
    open: false,
    openDialog: () => {},
    closeDialog: () => {}
})

export const useSubscriptionDialog = () => useContext(SubscriptionDialogContext)

export const SubscriptionDialogProvider = ({ children }: { children: React.ReactNode }) => {
    const [open, setOpen] = useState(false)

    const openDialog = () => setOpen(true)
    const closeDialog = () => setOpen(false)

    return (
        <SubscriptionDialogContext.Provider value={{ open, openDialog, closeDialog }}>
            {children}
            <Dialog open={open} onClose={closeDialog} fullWidth maxWidth='md' aria-labelledby='subscription-dialog-title'>
                <DialogTitle sx={{ fontSize: '1rem' }} id='subscription-dialog-title'>
                    Upgrade your plan
                </DialogTitle>
                <DialogContent>
                    <PurchaseSubscription />
                </DialogContent>
            </Dialog>
        </SubscriptionDialogContext.Provider>
    )
}
