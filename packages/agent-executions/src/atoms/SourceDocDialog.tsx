import { createPortal } from 'react-dom'
import { useState, useEffect } from 'react'
import { Box, Dialog, DialogContent, DialogTitle, Typography } from '@mui/material'
import ReactJson from 'flowise-react-json-view'
import { useConfigContext } from '../infrastructure/store/ConfigContext'

interface SourceDocDialogProps {
    show: boolean
    dialogProps: {
        data?: Record<string, unknown>
        title?: string
    }
    onCancel: () => void
}

const SourceDocDialog = ({ show, dialogProps, onCancel }: SourceDocDialogProps) => {
    const config = useConfigContext()
    const portalElement = config.portalElement || document.body

    const [data, setData] = useState<Record<string, unknown>>({})

    useEffect(() => {
        if (dialogProps.data) setData(dialogProps.data)
        return () => {
            setData({})
        }
    }, [dialogProps])

    const component = show ? (
        <Dialog
            onClose={onCancel}
            open={show}
            fullWidth
            maxWidth='sm'
            aria-labelledby='alert-dialog-title'
            aria-describedby='alert-dialog-description'
        >
            <DialogTitle sx={{ fontSize: '1rem' }} id='alert-dialog-title'>
                {dialogProps.title ?? 'Source Documents'}
            </DialogTitle>
            <DialogContent>
                {(data as { error?: string }).error && (
                    <Box
                        sx={{
                            p: 2,
                            borderRadius: 1,
                            bgcolor: 'error.light',
                            color: 'error.dark',
                            overflowX: 'auto',
                            wordBreak: 'break-word'
                        }}
                    >
                        <Typography variant='body2' fontWeight='medium'>
                            Error:
                        </Typography>
                        <Typography variant='body2' sx={{ whiteSpace: 'pre-wrap' }}>
                            {String((data as { error?: string }).error)}
                        </Typography>
                    </Box>
                )}
                <ReactJson
                    theme={config.isDarkMode ? 'ocean' : 'rjv-default'}
                    style={{ padding: 10, borderRadius: 10 }}
                    src={data}
                    name={null}
                    quotesOnKeys={false}
                    enableClipboard={false}
                    displayDataTypes={false}
                />
            </DialogContent>
        </Dialog>
    ) : null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return createPortal(component, portalElement) as any
}

export default SourceDocDialog
