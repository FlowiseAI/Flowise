import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useSelector, useDispatch } from 'react-redux'
import PropTypes from 'prop-types'
import { Dialog, DialogContent, DialogTitle } from '@mui/material'
import PerfectScrollbar from 'react-perfect-scrollbar'
import { JsonEditorInput } from 'ui-component/json/JsonEditor'
import { HIDE_CANVAS_DIALOG, SHOW_CANVAS_DIALOG } from 'store/actions'

const FormatPromptValuesDialog = ({ show, dialogProps, onChange, onCancel }) => {
    const portalElement = document.getElementById('portal')
    const customization = useSelector((state) => state.customization)
    const dispatch = useDispatch()

    useEffect(() => {
        if (show) dispatch({ type: SHOW_CANVAS_DIALOG })
        else dispatch({ type: HIDE_CANVAS_DIALOG })
        return () => dispatch({ type: HIDE_CANVAS_DIALOG })
    }, [show, dispatch])

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
                Format Prompt Values
            </DialogTitle>
            <DialogContent>
                <PerfectScrollbar
                    style={{
                        height: '100%',
                        maxHeight: 'calc(100vh - 220px)',
                        overflowX: 'hidden'
                    }}
                >
                    <JsonEditorInput
                        onChange={(newValue) => onChange(newValue)}
                        value={dialogProps.value}
                        isDarkMode={customization.isDarkMode}
                        inputParam={dialogProps.inputParam}
                        nodes={dialogProps.nodes}
                        edges={dialogProps.edges}
                        nodeId={dialogProps.nodeId}
                    />
                </PerfectScrollbar>
            </DialogContent>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

FormatPromptValuesDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onChange: PropTypes.func,
    onCancel: PropTypes.func
}

export default FormatPromptValuesDialog
