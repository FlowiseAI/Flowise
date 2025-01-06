import * as React from 'react'
import PropTypes from 'prop-types'
import { useSelector } from 'react-redux'
import { Modal } from '@mui/base/Modal'
import { IconX } from '@tabler/icons-react'

import { cn } from '@/lib/utils'

const Backdrop = React.forwardRef((props, ref) => {
    const { className, ...other } = props
    return (
        <div
            ref={ref}
            className={cn(
                'fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
                className
            )}
            {...other}
        />
    )
})
Backdrop.displayName = 'Backdrop'
Backdrop.propTypes = {
    className: PropTypes.string
}

const Dialog = React.forwardRef((props, ref) => {
    const { open, onClose, children, ...other } = props
    const customization = useSelector((state) => state.customization)
    return (
        <Modal
            ref={ref}
            open={open}
            onClose={onClose}
            {...other}
            className={`fixed inset-0 z-50 flex items-center justify-center ${customization.isDarkMode ? 'dark' : ''}`}
            slots={{
                backdrop: Backdrop
            }}
        >
            {children}
        </Modal>
    )
})
Dialog.displayName = 'Dialog'
Dialog.propTypes = {
    open: PropTypes.bool,
    onClose: PropTypes.func,
    children: PropTypes.node
}

const DialogContent = React.forwardRef(({ className, children, onClose, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-border bg-background text-card-foreground p-6 shadow-lg duration-200 sm:rounded-lg',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
            className
        )}
        {...props}
    >
        {children}
        {onClose && (
            <button
                onClick={onClose}
                className='absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground'
            >
                <IconX size={16} />
                <span className='sr-only'>Close</span>
            </button>
        )}
    </div>
))
DialogContent.displayName = 'DialogContent'
DialogContent.propTypes = {
    className: PropTypes.string,
    children: PropTypes.node,
    onClose: PropTypes.func
}

const DialogHeader = React.forwardRef(({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
))
DialogHeader.displayName = 'DialogHeader'
DialogHeader.propTypes = {
    className: PropTypes.string
}

const DialogFooter = React.forwardRef(({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)} {...props} />
))
DialogFooter.displayName = 'DialogFooter'
DialogFooter.propTypes = {
    className: PropTypes.string
}

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
    <h2 ref={ref} className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props}>
        {props.children}
    </h2>
))
DialogTitle.displayName = 'DialogTitle'
DialogTitle.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string
}

const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
))
DialogDescription.displayName = 'DialogDescription'
DialogDescription.propTypes = {
    className: PropTypes.string
}

export { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription }
