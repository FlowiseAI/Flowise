import * as React from 'react'
import PropTypes from 'prop-types'
import { IconButton, DialogTitle, Chip, DialogContent, Dialog, Button, Divider, Grid, Typography } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import TextsmsIcon from '@mui/icons-material/Textsms'
import ThumbUpIcon from '@mui/icons-material/ThumbUp'
import ThumbDownIcon from '@mui/icons-material/ThumbDown'
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer'

export function ChatLogDetails({ details, onClose }) {
    const open = details && !!Object.keys(details).length

    const descriptionElementRef = React.useRef(null)

    React.useEffect(() => {
        if (open) {
            const { current: descriptionElement } = descriptionElementRef
            if (descriptionElement !== null) {
                descriptionElement.focus()
            }
        }
    }, [open])

    return (
        <div>
            <Dialog
                open={Boolean(open)}
                onClose={onClose}
                aria-labelledby='scroll-dialog-title'
                aria-describedby='scroll-dialog-description'
                fullWidth={true}
            >
                <DialogTitle id='scroll-dialog-title' minHeight='3rem'>
                    <IconButton
                        aria-label='close'
                        onClick={onClose}
                        sx={{
                            position: 'absolute',
                            right: 8,
                            top: 8,
                            color: (theme) => theme.palette.grey[500]
                        }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <Divider />
                <DialogContent dividers={scroll === 'paper'}>
                    <Grid display='grid' gap={1}>
                        {/* TODO to move in component - start */}
                        <Grid display='grid' gridTemplateColumns='1fr 3fr' gap={1}>
                            <Chip label='Question: ' style={{ width: '100%' }} />
                            {details?.text?.question}
                            <Chip label='Context: ' style={{ width: '100%' }} />
                            {details?.context}
                            <Chip label='Inputs: ' style={{ width: '100%' }} />
                            {details?.inputs}
                            <Chip label='Answer: ' style={{ width: '100%' }} />
                            {details?.text?.answer}
                            <Chip label='Quality: ' style={{ width: '100%' }} />
                            <Grid>
                                {details?.quality?.thumbsUp && <ThumbUpIcon color='success' />}
                                {details?.quality?.thumbsDown && <ThumbDownIcon color='error' />}
                                {details?.quality?.text && (
                                    <Grid container>
                                        <TextsmsIcon />
                                        <Typography component='p' marginLeft='6px'>
                                            {details?.quality?.text}
                                        </Typography>
                                    </Grid>
                                )}
                            </Grid>
                        </Grid>
                        {/* to move in component - end */}
                        <Divider />
                        <Button variant='contained' startIcon={<QuestionAnswerIcon />}>
                            Show thread
                        </Button>
                    </Grid>
                </DialogContent>
            </Dialog>
        </div>
    )
}

ChatLogDetails.propTypes = {
    details: PropTypes.object,
    onClose: function () {}
}
