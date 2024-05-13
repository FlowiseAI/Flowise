import PropTypes from 'prop-types'
import { createPortal } from 'react-dom'
import { useDispatch } from 'react-redux'
import { useState, useEffect } from 'react'

import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    IconButton,
    OutlinedInput,
    Stack,
    Typography
} from '@mui/material'
import { IconEraser, IconTrash, IconX } from '@tabler/icons-react'
import PerfectScrollbar from 'react-perfect-scrollbar'

import { BackdropLoader } from '@/ui-component/loading/BackdropLoader'
import { StyledButton } from '@/ui-component/button/StyledButton'

import scraperApi from '@/api/scraper'

import useNotifier from '@/utils/useNotifier'

import {
    HIDE_CANVAS_DIALOG,
    SHOW_CANVAS_DIALOG,
    enqueueSnackbar as enqueueSnackbarAction,
    closeSnackbar as closeSnackbarAction
} from '@/store/actions'

const ManageScrapedLinksDialog = ({ show, dialogProps, onCancel, onSave }) => {
    const portalElement = document.getElementById('portal')
    const dispatch = useDispatch()

    useNotifier()
    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [loading, setLoading] = useState(false)
    const [selectedLinks, setSelectedLinks] = useState([])
    const [url, setUrl] = useState('')

    useEffect(() => {
        if (dialogProps.url) setUrl(dialogProps.url)
        if (dialogProps.selectedLinks) setSelectedLinks(dialogProps.selectedLinks)

        return () => {
            setLoading(false)
            setSelectedLinks([])
            setUrl('')
        }
    }, [dialogProps])

    useEffect(() => {
        if (show) dispatch({ type: SHOW_CANVAS_DIALOG })
        else dispatch({ type: HIDE_CANVAS_DIALOG })
        return () => dispatch({ type: HIDE_CANVAS_DIALOG })
    }, [show, dispatch])

    const handleFetchLinks = async () => {
        setLoading(true)
        try {
            const fetchLinksResp = await scraperApi.fetchLinks(url, dialogProps.relativeLinksMethod, dialogProps.limit)
            if (fetchLinksResp.data) {
                setSelectedLinks(fetchLinksResp.data.links)
                enqueueSnackbar({
                    message: 'Successfully fetched links',
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
            }
        } catch (error) {
            enqueueSnackbar({
                message: typeof error.response.data === 'object' ? error.response.data.message : error.response.data,
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
        setLoading(false)
    }

    const handleChangeLink = (index, event) => {
        const { value } = event.target
        const links = [...selectedLinks]
        links[index] = value
        setSelectedLinks(links)
    }

    const handleRemoveLink = (index) => {
        const links = [...selectedLinks]
        links.splice(index, 1)
        setSelectedLinks(links)
    }

    const handleRemoveAllLinks = () => {
        setSelectedLinks([])
    }

    const handleSaveLinks = () => {
        onSave(url, selectedLinks)
    }

    const component = show ? (
        <Dialog
            onClose={onCancel}
            open={show}
            fullWidth
            maxWidth='sm'
            aria-labelledby='manage-scraped-links-dialog-title'
            aria-describedby='manage-scraped-links-dialog-description'
        >
            <DialogTitle sx={{ fontSize: '1rem' }} id='manage-scraped-links-dialog-title'>
                {dialogProps.title || `Manage Scraped Links - ${url}`}
            </DialogTitle>
            <DialogContent>
                <Box sx={{ mb: 4 }}>
                    <Stack flexDirection='row' gap={1} sx={{ width: '100%' }}>
                        <FormControl sx={{ mt: 1, width: '100%', display: 'flex', flexShrink: 1 }} size='small'>
                            <OutlinedInput
                                id='url'
                                size='small'
                                type='text'
                                value={url}
                                name='url'
                                onChange={(e) => {
                                    setUrl(e.target.value)
                                }}
                            />
                        </FormControl>
                        <Button
                            disabled={!url}
                            sx={{ borderRadius: '12px', mt: 1, display: 'flex', flexShrink: 0 }}
                            size='small'
                            variant='contained'
                            onClick={handleFetchLinks}
                        >
                            Fetch Links
                        </Button>
                    </Stack>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography sx={{ fontWeight: 500 }}>Scraped Links</Typography>
                    {selectedLinks.length > 0 ? (
                        <Button
                            sx={{ height: 'max-content', width: 'max-content' }}
                            variant='outlined'
                            color='error'
                            title='Clear All Links'
                            onClick={handleRemoveAllLinks}
                            startIcon={<IconEraser />}
                        >
                            Clear All
                        </Button>
                    ) : null}
                </Box>
                <>
                    {loading && <BackdropLoader open={loading} />}
                    {selectedLinks.length > 0 ? (
                        <PerfectScrollbar
                            style={{
                                height: '100%',
                                maxHeight: '320px',
                                overflowX: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 4
                            }}
                        >
                            {selectedLinks.map((link, index) => (
                                <div key={index} style={{ display: 'flex', width: '100%' }}>
                                    <Box sx={{ display: 'flex', width: '100%' }}>
                                        <OutlinedInput
                                            sx={{ width: '100%' }}
                                            key={index}
                                            type='text'
                                            onChange={(e) => handleChangeLink(index, e)}
                                            size='small'
                                            value={link}
                                            name={`link_${index}`}
                                        />
                                    </Box>
                                    <Box sx={{ width: 'auto', flexGrow: 1 }}>
                                        <IconButton
                                            sx={{ height: 30, width: 30 }}
                                            size='small'
                                            color='error'
                                            onClick={() => handleRemoveLink(index)}
                                            edge='end'
                                        >
                                            <IconTrash />
                                        </IconButton>
                                    </Box>
                                </div>
                            ))}
                        </PerfectScrollbar>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Typography sx={{ my: 2 }}>Links scraped from the URL will appear here</Typography>
                        </div>
                    )}
                </>
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel}>Cancel</Button>
                <StyledButton variant='contained' onClick={handleSaveLinks}>
                    Save
                </StyledButton>
            </DialogActions>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

ManageScrapedLinksDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func,
    onSave: PropTypes.func
}

export default ManageScrapedLinksDialog
