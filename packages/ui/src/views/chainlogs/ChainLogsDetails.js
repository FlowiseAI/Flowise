import { useEffect, useRef } from 'react'
import PropTypes from 'prop-types'
import { IconButton, DialogTitle, DialogContent, Dialog, Divider, Grid, Typography } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import moment from 'moment'
import ReactJson from 'flowise-react-json-view'
import { useSelector } from 'react-redux'

export function ChainLogsDetails({ details, onClose }) {
    const customization = useSelector((state) => state.customization)
    const open = details && !!Object.keys(details).length

    const descriptionElementRef = useRef(null)

    useEffect(() => {
        if (open) {
            const { current: descriptionElement } = descriptionElementRef
            if (descriptionElement !== null) {
                descriptionElement.focus()
            }
        }
    }, [open])

    return (
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
                <Grid display='grid' gridTemplateColumns='1fr 3fr' gap={1}>
                    <Typography>Chatflow name: </Typography>
                    <Typography fontWeight='600'>{details?.chatflowName}</Typography>
                    <Typography>Chat ID: </Typography>
                    <Typography fontWeight='600'>{details?.chatId}</Typography>
                    <Typography>Timestamp: </Typography>
                    <Typography fontWeight='600'>{moment(details?.createdDate).format('DD.MM.YYYY HH:MM')}</Typography>
                </Grid>
                <Divider style={{ marginBottom: '1rem', marginTop: '1rem' }} />
                <ReactJson
                    theme={customization.isDarkMode ? 'ocean' : 'rjv-default'}
                    style={{ padding: 10, borderRadius: 10 }}
                    src={details?.result}
                    name={null}
                    quotesOnKeys={false}
                    enableClipboard={false}
                    displayDataTypes={false}
                />
            </DialogContent>
        </Dialog>
    )
}

ChainLogsDetails.propTypes = {
    details: PropTypes.object,
    onClose: function () {}
}
