import { useState, useRef, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import PropTypes from 'prop-types'

import { Button } from '@mui/material'
import { IconDatabaseImport, IconX } from '@tabler/icons'

// project import
import { StyledFab } from '@/ui-component/button/StyledFab'
import VectorStoreDialog from './VectorStoreDialog'

// api
import vectorstoreApi from '@/api/vectorstore'

// Hooks
import useNotifier from '@/utils/useNotifier'

// Const
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from '@/store/actions'

export const VectorStorePopUp = ({ chatflowid }) => {
    const dispatch = useDispatch()

    useNotifier()
    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [open, setOpen] = useState(false)
    const [showExpandDialog, setShowExpandDialog] = useState(false)
    const [expandDialogProps, setExpandDialogProps] = useState({})

    const anchorRef = useRef(null)
    const prevOpen = useRef(open)

    const handleToggle = () => {
        setOpen((prevopen) => !prevopen)
        const props = {
            open: true,
            title: 'Upsert Vector Store',
            chatflowid
        }
        setExpandDialogProps(props)
        setShowExpandDialog(true)
    }

    const onUpsert = async () => {
        try {
            await vectorstoreApi.upsertVectorStore(chatflowid, {})
            enqueueSnackbar({
                message: 'Succesfully upserted vector store',
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'success',
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                            <IconX />
                        </Button>
                    )
                }
            })
        } catch (error) {
            const errorData = error.response.data || `${error.response.status}: ${error.response.statusText}`
            enqueueSnackbar({
                message: errorData,
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'error',
                    persist: true,
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                            <IconX />
                        </Button>
                    )
                }
            })
        }
    }

    useEffect(() => {
        if (prevOpen.current === true && open === false) {
            anchorRef.current.focus()
        }
        prevOpen.current = open

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, chatflowid])

    return (
        <>
            <StyledFab
                sx={{ position: 'absolute', right: 80, top: 20 }}
                ref={anchorRef}
                size='small'
                color='teal'
                aria-label='upsert'
                title='Upsert Vector Database'
                onClick={handleToggle}
            >
                {open ? <IconX /> : <IconDatabaseImport />}
            </StyledFab>
            <VectorStoreDialog
                show={showExpandDialog}
                dialogProps={expandDialogProps}
                onUpsert={onUpsert}
                onCancel={() => {
                    setShowExpandDialog(false)
                    setOpen((prevopen) => !prevopen)
                }}
            ></VectorStoreDialog>
        </>
    )
}

VectorStorePopUp.propTypes = { chatflowid: PropTypes.string }
