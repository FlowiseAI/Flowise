import { createPortal } from 'react-dom'
import { useDispatch } from 'react-redux'
import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { Dialog, DialogContent } from '@mui/material'
import PerfectScrollbar from 'react-perfect-scrollbar'
import NodeInputHandler from 'views/canvas/NodeInputHandler'
import { HIDE_CANVAS_DIALOG, SHOW_CANVAS_DIALOG } from 'store/actions'

const AdditionalParamsDialog = ({ show, dialogProps, onCancel }) => {
    const portalElement = document.getElementById('portal')
    const dispatch = useDispatch()

    const [inputParams, setInputParams] = useState([])
    const [data, setData] = useState({})

    useEffect(() => {
        if (dialogProps.inputParams) setInputParams(dialogProps.inputParams)
        if (dialogProps.data) setData(dialogProps.data)

        return () => {
            setInputParams([])
            setData({})
        }
    }, [dialogProps])

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
            <DialogContent>
                <PerfectScrollbar
                    style={{
                        height: '100%',
                        maxHeight: 'calc(100vh - 220px)',
                        overflowX: 'hidden'
                    }}
                >
                    {inputParams.map((inputParam, index) => (
                        <NodeInputHandler
                            disabled={dialogProps.disabled}
                            key={index}
                            inputParam={inputParam}
                            data={data}
                            isAdditionalParams={true}
                        />
                    ))}
                </PerfectScrollbar>
            </DialogContent>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

AdditionalParamsDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func
}

export default AdditionalParamsDialog
