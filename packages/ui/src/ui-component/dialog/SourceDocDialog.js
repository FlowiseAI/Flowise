import { createPortal } from 'react-dom'
import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import PropTypes from 'prop-types'
import { Dialog, DialogContent, DialogTitle } from '@mui/material'
import ReactJson from 'flowise-react-json-view'

const SourceDocDialog = ({ show, dialogProps, onCancel }) => {
    const portalElement = document.getElementById('portal')
    const customization = useSelector((state) => state.customization)

    const [data, setData] = useState({})

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
                Source Document
            </DialogTitle>
            <DialogContent>
                <ReactJson
                    theme={customization.isDarkMode ? 'ocean' : 'rjv-default'}
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

    return createPortal(component, portalElement)
}

SourceDocDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func
}

export default SourceDocDialog
