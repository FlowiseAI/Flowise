import { useState, useRef, useEffect } from 'react'
import PropTypes from 'prop-types'

import { IconDatabaseImport, IconX } from '@tabler/icons-react'

// project import
import { StyledFab } from '@/ui-component/button/StyledFab'
import VectorStoreDialog from './VectorStoreDialog'
import UpsertResultDialog from './UpsertResultDialog'

export const VectorStorePopUp = ({ chatflowid }) => {
    const [open, setOpen] = useState(false)
    const [showExpandDialog, setShowExpandDialog] = useState(false)
    const [expandDialogProps, setExpandDialogProps] = useState({})
    const [showUpsertResultDialog, setShowUpsertResultDialog] = useState(false)
    const [upsertResultDialogProps, setUpsertResultDialogProps] = useState({})

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
                onCancel={() => {
                    setShowExpandDialog(false)
                    setOpen((prevopen) => !prevopen)
                }}
                onIndexResult={(indexRes) => {
                    setShowExpandDialog(false)
                    setShowUpsertResultDialog(true)
                    setUpsertResultDialogProps({ ...indexRes })
                }}
            ></VectorStoreDialog>
            <UpsertResultDialog
                show={showUpsertResultDialog}
                dialogProps={upsertResultDialogProps}
                onCancel={() => {
                    setShowUpsertResultDialog(false)
                    setOpen(false)
                }}
            ></UpsertResultDialog>
        </>
    )
}

VectorStorePopUp.propTypes = { chatflowid: PropTypes.string }
