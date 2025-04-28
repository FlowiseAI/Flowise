import React from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'

interface PreviewDialogProps {
    open: boolean
    onClose: () => void
    code: string
    language: string
    getHTMLPreview: (code: string) => string
    getReactPreview: (code: string) => string
}

export const PreviewDialog: React.FC<PreviewDialogProps> = ({ open, onClose, code, language, getHTMLPreview, getReactPreview }) => {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth='lg'
            fullWidth
            PaperProps={{
                sx: {
                    height: '80vh'
                }
            }}
        >
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Preview ({language})
                <IconButton
                    aria-label='close'
                    onClick={onClose}
                    sx={{
                        color: (theme) => theme.palette.grey[500]
                    }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent sx={{ p: 0, height: '100%' }}>
                <iframe
                    srcDoc={language === 'html' ? getHTMLPreview(code) : getReactPreview(code)}
                    style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        backgroundColor: '#fff'
                    }}
                    sandbox='allow-scripts'
                    title='Code Preview'
                />
            </DialogContent>
        </Dialog>
    )
}
