import { useEffect, useRef, useState } from 'react'
import { stringify, exportData } from '@/utils/exportImport'

// Material UI
import { Button, Dialog, DialogTitle, DialogContent, Stack, FormControlLabel, Checkbox, DialogActions, Box, MenuItem } from '@mui/material'

// Assets
import ExportingGIF from '@/assets/images/Exporting.gif'

// API
import exportImportApi from '@/api/exportimport'

// Hooks
import useApi from '@/hooks/useApi'
import { getErrorMessage } from '@/utils/errorHandler'

interface ExportDialogProps {
    show: boolean
    onCancel: () => void
    onExport: (data: string[]) => void
}

interface ExportImportComponentProps {
    onClose: () => void
    onSuccess?: () => void
}

const dataToExport = ['Chatflows', 'Agentflows', 'Tools', 'Variables', 'Assistants']

const ExportDialog = ({ show, onCancel, onExport }: ExportDialogProps) => {
    const [selectedData, setSelectedData] = useState(['Chatflows', 'Agentflows', 'Tools', 'Variables', 'Assistants'])
    const [isExporting, setIsExporting] = useState(false)

    useEffect(() => {
        if (show) setIsExporting(false)

        return () => {
            setIsExporting(false)
        }
    }, [show])

    return (
        <Dialog
            onClose={!isExporting ? onCancel : undefined}
            open={show}
            fullWidth
            maxWidth='sm'
            aria-labelledby='export-dialog-title'
            aria-describedby='export-dialog-description'
        >
            <DialogTitle sx={{ fontSize: '1rem' }} id='export-dialog-title'>
                {!isExporting ? 'Select Data to Export' : 'Exporting..'}
            </DialogTitle>
            <DialogContent>
                {!isExporting && (
                    <Stack direction='row' sx={{ gap: 1, flexWrap: 'wrap' }}>
                        {dataToExport.map((data, index) => (
                            <FormControlLabel
                                key={index}
                                control={
                                    <Checkbox
                                        color='success'
                                        checked={selectedData.includes(data)}
                                        onChange={(event) => {
                                            setSelectedData(
                                                event.target.checked
                                                    ? [...selectedData, data]
                                                    : selectedData.filter((item) => item !== data)
                                            )
                                        }}
                                    />
                                }
                                label={data}
                            />
                        ))}
                    </Stack>
                )}
                {isExporting && (
                    <Box sx={{ height: 'auto', display: 'flex', justifyContent: 'center', mb: 3 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <img
                                style={{
                                    objectFit: 'cover',
                                    height: 'auto',
                                    width: 'auto'
                                }}
                                src={ExportingGIF}
                                alt='ExportingGIF'
                            />
                            <span>Exporting data might take a while</span>
                        </div>
                    </Box>
                )}
            </DialogContent>
            {!isExporting && (
                <DialogActions>
                    <Button onClick={onCancel}>Cancel</Button>
                    <Button
                        disabled={selectedData.length === 0}
                        variant='contained'
                        onClick={() => {
                            setIsExporting(true)
                            onExport(selectedData)
                        }}
                    >
                        Export
                    </Button>
                </DialogActions>
            )}
        </Dialog>
    )
}

export const ExportImportMenuItems = ({ onClose, onSuccess }: ExportImportComponentProps) => {
    const [exportDialogOpen, setExportDialogOpen] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    const importAllApi = useApi(exportImportApi.importData)
    const exportAllApi = useApi(exportImportApi.exportData)

    const fileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return

        const file = e.target.files[0]

        const reader = new FileReader()
        reader.onload = (evt) => {
            if (!evt?.target?.result) {
                return
            }
            const body = JSON.parse(evt.target.result as string)
            importAllApi.request(body)
        }
        reader.readAsText(file)
    }

    const importAll = () => {
        if (inputRef.current) {
            inputRef.current.click()
        }
        if (onClose) onClose()
    }

    const onExport = (data: string[]) => {
        const body: Record<string, boolean> = {}
        if (data.includes('Chatflows')) body.chatflow = true
        if (data.includes('Agentflows')) body.agentflow = true
        if (data.includes('Tools')) body.tool = true
        if (data.includes('Variables')) body.variable = true
        if (data.includes('Assistants')) body.assistant = true

        exportAllApi.request(body)
    }

    useEffect(() => {
        if (importAllApi.data && onSuccess) {
            onSuccess()
            if (onClose) onClose()
            window.location.href = '/'
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [importAllApi.data])

    useEffect(() => {
        if (exportAllApi.data) {
            setExportDialogOpen(false)
            try {
                const dataStr = stringify(exportData(exportAllApi.data))
                const blob = new Blob([dataStr], { type: 'application/json' })
                const dataUri = URL.createObjectURL(blob)

                const linkElement = document.createElement('a')
                linkElement.setAttribute('href', dataUri)
                linkElement.setAttribute('download', exportAllApi.data.FileDefaultName)
                linkElement.click()

                if (onClose) onClose()
            } catch (error) {
                console.error(`Failed to export all: ${getErrorMessage(error)}`)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [exportAllApi.data])

    return (
        <>
            <MenuItem onClick={() => setExportDialogOpen(true)}>Export Data</MenuItem>
            <MenuItem onClick={importAll}>Import Data</MenuItem>
            <input ref={inputRef} type='file' hidden onChange={fileChange} accept='.json' />
            <ExportDialog show={exportDialogOpen} onCancel={() => setExportDialogOpen(false)} onExport={(data) => onExport(data)} />
        </>
    )
}

export default ExportImportMenuItems
