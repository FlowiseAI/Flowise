import React, { useState, useEffect } from 'react'
import Snackbar from '@mui/material/Snackbar'
import Slide, { SlideProps } from '@mui/material/Slide'

type TransitionProps = Omit<SlideProps, 'direction'>

function TransitionLeft(props: TransitionProps) {
    return <Slide {...props} direction='left' />
}

const SnackMessage = ({ message }: { message: string }) => {
    const [theMessageOpen, setTheMessageOpen] = useState(false)
    const [theMessageTransition, setTheMessageTransition] = useState<React.ComponentType<TransitionProps> | undefined>(undefined)

    useEffect(() => {
        if (message.trim() === '') {
            setTheMessageOpen(false)
        } else {
            setTheMessageOpen(true)
        }
    }, [message])

    const handleMessageClose = () => {
        setTheMessageOpen(false)
    }

    return (
        <Snackbar
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            open={theMessageOpen}
            autoHideDuration={6000}
            onClose={handleMessageClose}
            TransitionComponent={theMessageTransition}
            message={message}
            key={theMessageTransition ? theMessageTransition.name : ''}
        />
    )
}

export default SnackMessage
