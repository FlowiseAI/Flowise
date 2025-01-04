import { useState, useEffect, useRef } from 'react'
import PropTypes from 'prop-types'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

const SaveChatflowDialog = ({ show, dialogProps, onCancel, onConfirm }) => {
    const inputRef = useRef(null)
    const [chatflowName, setChatflowName] = useState('')
    const [isReadyToSave, setIsReadyToSave] = useState(false)

    useEffect(() => {
        if (show) {
            inputRef?.current?.focus()
        }
    }, [show])

    useEffect(() => {
        if (chatflowName) setIsReadyToSave(true)
        else setIsReadyToSave(false)
    }, [chatflowName])

    return (
        <Dialog disableRestoreFocus open={show} onClose={onCancel}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{dialogProps.title}</DialogTitle>
                </DialogHeader>
                <Input
                    // eslint-disable-next-line jsx-a11y/no-autofocus
                    autoFocus
                    id='chatflow-name'
                    onChange={(e) => setChatflowName(e.target.value)}
                    onKeyDown={(e) => {
                        if (isReadyToSave && e.key === 'Enter') onConfirm(e.target.value)
                    }}
                    placeholder='My New Chatflow'
                    ref={inputRef}
                    value={chatflowName}
                    type='text'
                />
                <DialogFooter>
                    <Button onClick={onCancel} size='sm' variant='ghost'>
                        {dialogProps.cancelButtonName}
                    </Button>
                    <Button disabled={!isReadyToSave} size='sm' onClick={() => onConfirm(chatflowName)}>
                        {dialogProps.confirmButtonName}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

SaveChatflowDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func
}

export default SaveChatflowDialog
