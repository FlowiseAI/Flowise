import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'
import { useDispatch, useSelector } from 'react-redux'
import ReactJson from 'flowise-react-json-view'
import { HIDE_CANVAS_DIALOG, SHOW_CANVAS_DIALOG } from '@/store/actions'

// Material
import { Button, Dialog, IconButton, DialogContent, DialogTitle, Typography } from '@mui/material'
import { IconEdit, IconTrash, IconX, IconLanguage } from '@tabler/icons-react'

// Project imports
import { CodeEditor } from '@/ui-component/editor/CodeEditor'
import { PermissionButton, PermissionIconButton } from '@/ui-component/button/RBACButtons'

const ExpandedChunkDialog = ({ show, dialogProps, onCancel, onChunkEdit, onDeleteChunk, isReadOnly }) => {
    const portalElement = document.getElementById('portal')

    const customization = useSelector((state) => state.customization)
    const dispatch = useDispatch()

    const [selectedChunk, setSelectedChunk] = useState()
    const [selectedChunkNumber, setSelectedChunkNumber] = useState()
    const [isEdit, setIsEdit] = useState(false)
    const [contentValue, setContentValue] = useState('')
    const [metadata, setMetadata] = useState({})

    const onClipboardCopy = (e) => {
        const src = e.src
        if (Array.isArray(src) || typeof src === 'object') {
            navigator.clipboard.writeText(JSON.stringify(src, null, '  '))
        } else {
            navigator.clipboard.writeText(src)
        }
    }

    const onEditCancel = () => {
        setContentValue(selectedChunk?.pageContent)
        setMetadata(selectedChunk?.metadata ? JSON.parse(selectedChunk?.metadata) : {})
        setIsEdit(false)
    }

    const onEditSaved = () => {
        onChunkEdit(contentValue, metadata, selectedChunk)
    }

    useEffect(() => {
        if (dialogProps.data) {
            setSelectedChunk(dialogProps.data?.selectedChunk)
            setContentValue(dialogProps.data?.selectedChunk?.pageContent)
            setSelectedChunkNumber(dialogProps?.data.selectedChunkNumber)
            if (dialogProps.data?.selectedChunk?.metadata) {
                if (typeof dialogProps.data?.selectedChunk?.metadata === 'string') {
                    setMetadata(JSON.parse(dialogProps.data?.selectedChunk?.metadata))
                } else if (typeof dialogProps.data?.selectedChunk?.metadata === 'object') {
                    setMetadata(dialogProps.data?.selectedChunk?.metadata)
                }
            }
        }
        return () => {
            setSelectedChunk()
            setSelectedChunkNumber()
            setContentValue('')
            setMetadata({})
            setIsEdit(false)
        }
    }, [dialogProps])

    useEffect(() => {
        if (show) dispatch({ type: SHOW_CANVAS_DIALOG })
        else dispatch({ type: HIDE_CANVAS_DIALOG })
        return () => dispatch({ type: HIDE_CANVAS_DIALOG })
    }, [show, dispatch])

    const component = show ? (
        <Dialog
            fullWidth
            maxWidth='md'
            open={show}
            onClose={onCancel}
            aria-labelledby='alert-dialog-title'
            aria-describedby='alert-dialog-description'
        >
            <DialogTitle style={{ fontSize: '1rem' }} id='alert-dialog-title'>
                {selectedChunk && selectedChunkNumber && (
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                        <Typography sx={{ flex: 1 }} variant='h4'>
                            #{selectedChunkNumber}. {selectedChunk.id}
                        </Typography>
                        {!isEdit && !isReadOnly && (
                            <PermissionIconButton
                                permissionId={'documentStores:preview-process'}
                                onClick={() => setIsEdit(true)}
                                size='small'
                                color='primary'
                                title='Edit Chunk'
                                sx={{ ml: 2 }}
                            >
                                <IconEdit />
                            </PermissionIconButton>
                        )}
                        {isEdit && !isReadOnly && (
                            <Button onClick={() => onEditCancel()} color='primary' title='Cancel' sx={{ ml: 2 }}>
                                Cancel
                            </Button>
                        )}
                        {isEdit && !isReadOnly && (
                            <PermissionButton
                                permissionId={'documentStores:preview-process'}
                                onClick={() => onEditSaved(true)}
                                color='primary'
                                title='Save'
                                variant='contained'
                                sx={{ ml: 2, mr: 1 }}
                            >
                                Save
                            </PermissionButton>
                        )}
                        {!isEdit && !isReadOnly && (
                            <PermissionIconButton
                                permissionId={'documentStores:delete-loader'}
                                onClick={() => onDeleteChunk(selectedChunk)}
                                size='small'
                                color='error'
                                title='Delete Chunk'
                                sx={{ ml: 1 }}
                            >
                                <IconTrash />
                            </PermissionIconButton>
                        )}
                        <IconButton onClick={onCancel} size='small' color='inherit' title='Close' sx={{ ml: 1 }}>
                            <IconX />
                        </IconButton>
                    </div>
                )}
            </DialogTitle>
            <DialogContent>
                {selectedChunk && selectedChunkNumber && (
                    <div>
                        <div
                            style={{
                                paddingLeft: '10px',
                                paddingRight: '10px',
                                paddingTop: '5px',
                                paddingBottom: '5px',
                                fontSize: '15px',
                                width: 'max-content',
                                borderRadius: '25px',
                                boxShadow: customization.isDarkMode
                                    ? '0 2px 14px 0 rgb(255 255 255 / 20%)'
                                    : '0 2px 14px 0 rgb(32 40 45 / 20%)',
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                                marginTop: '5px',
                                marginBottom: '10px'
                            }}
                        >
                            <IconLanguage style={{ marginRight: 5 }} size={15} />
                            {selectedChunk?.pageContent?.length} characters
                        </div>
                        <div style={{ marginTop: '5px' }}></div>
                        {!isEdit && (
                            <CodeEditor
                                disabled={true}
                                height='max-content'
                                value={contentValue}
                                theme={customization.isDarkMode ? 'dark' : 'light'}
                                basicSetup={{
                                    lineNumbers: false,
                                    foldGutter: false,
                                    autocompletion: false,
                                    highlightActiveLine: false
                                }}
                            />
                        )}
                        {isEdit && (
                            <CodeEditor
                                disabled={false}
                                // eslint-disable-next-line
                                autoFocus={true}
                                height='max-content'
                                value={contentValue}
                                theme={customization.isDarkMode ? 'dark' : 'light'}
                                basicSetup={{
                                    lineNumbers: false,
                                    foldGutter: false,
                                    autocompletion: false,
                                    highlightActiveLine: false
                                }}
                                onValueChange={(text) => setContentValue(text)}
                            />
                        )}
                        <div
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.stopPropagation()
                                }
                            }}
                            role='presentation'
                            style={{ marginTop: '20px', marginBottom: '15px' }}
                        >
                            {!isEdit && (
                                <ReactJson
                                    theme={customization.isDarkMode ? 'ocean' : 'rjv-default'}
                                    src={metadata}
                                    style={{ padding: '10px' }}
                                    name={null}
                                    quotesOnKeys={false}
                                    enableClipboard={false}
                                    displayDataTypes={false}
                                    collapsed={1}
                                />
                            )}
                            {isEdit && (
                                <ReactJson
                                    theme={customization.isDarkMode ? 'ocean' : 'rjv-default'}
                                    src={metadata}
                                    style={{ padding: '10px' }}
                                    name={null}
                                    quotesOnKeys={false}
                                    displayDataTypes={false}
                                    enableClipboard={(e) => onClipboardCopy(e)}
                                    onEdit={(edit) => {
                                        setMetadata(edit.updated_src)
                                    }}
                                    onAdd={() => {
                                        //console.log(add)
                                    }}
                                    onDelete={(deleteobj) => {
                                        setMetadata(deleteobj.updated_src)
                                    }}
                                />
                            )}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

ExpandedChunkDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func,
    onChunkEdit: PropTypes.func,
    onDeleteChunk: PropTypes.func,
    isReadOnly: PropTypes.bool
}

export default ExpandedChunkDialog
