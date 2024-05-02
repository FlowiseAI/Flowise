import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useDispatch } from 'react-redux'
import PropTypes from 'prop-types'
import { List, ListItemButton, Dialog, DialogContent, DialogTitle, Box, OutlinedInput, InputAdornment, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { IconSearch, IconX } from '@tabler/icons'

// API
import documentStoreApi from '@/api/documentstore'

// const
import { baseURL } from '@/store/constant'
import { HIDE_CANVAS_DIALOG, SHOW_CANVAS_DIALOG } from '@/store/actions'
import useApi from '@/hooks/useApi'

const DocumentLoaderListDialog = ({ show, dialogProps, onCancel, onDocLoaderSelected }) => {
    const portalElement = document.getElementById('portal')
    const dispatch = useDispatch()
    const theme = useTheme()
    const [searchValue, setSearchValue] = useState('')
    const [documentLoaders, setDocumentLoaders] = useState([])

    const getDocumentLoadersApi = useApi(documentStoreApi.getDocumentLoaders)

    const onSearchChange = (val) => {
        setSearchValue(val)
    }

    function filterFlows(data) {
        return data.name.toLowerCase().indexOf(searchValue.toLowerCase()) > -1
    }

    useEffect(() => {
        if (dialogProps.documentLoaders) {
            setDocumentLoaders(dialogProps.documentLoaders)
        }
    }, [dialogProps])

    useEffect(() => {
        getDocumentLoadersApi.request()

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (getDocumentLoadersApi.data) {
            setDocumentLoaders(getDocumentLoadersApi.data)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getDocumentLoadersApi.data])

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
            <DialogTitle sx={{ fontSize: '1rem', p: 3, pb: 0 }} id='alert-dialog-title'>
                {dialogProps.title}
            </DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: '75vh', position: 'relative', px: 3, pb: 3 }}>
                <Box
                    sx={{
                        backgroundColor: theme.palette.background.paper,
                        pt: 2,
                        position: 'sticky',
                        top: 0,
                        zIndex: 10
                    }}
                >
                    <OutlinedInput
                        sx={{ width: '100%', pr: 2, pl: 2, position: 'sticky' }}
                        id='input-search-credential'
                        value={searchValue}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder='Search'
                        startAdornment={
                            <InputAdornment position='start'>
                                <IconSearch stroke={1.5} size='1rem' color={theme.palette.grey[500]} />
                            </InputAdornment>
                        }
                        endAdornment={
                            <InputAdornment
                                position='end'
                                sx={{
                                    cursor: 'pointer',
                                    color: theme.palette.grey[500],
                                    '&:hover': {
                                        color: theme.palette.grey[900]
                                    }
                                }}
                                title='Clear Search'
                            >
                                <IconX
                                    stroke={1.5}
                                    size='1rem'
                                    onClick={() => onSearchChange('')}
                                    style={{
                                        cursor: 'pointer'
                                    }}
                                />
                            </InputAdornment>
                        }
                        aria-describedby='search-helper-text'
                        inputProps={{
                            'aria-label': 'weight'
                        }}
                    />
                </Box>
                <List
                    sx={{
                        width: '100%',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 2,
                        py: 0,
                        zIndex: 9,
                        borderRadius: '10px',
                        [theme.breakpoints.down('md')]: {
                            maxWidth: 370
                        }
                    }}
                >
                    {[...documentLoaders].filter(filterFlows).map((documentLoader) => (
                        <ListItemButton
                            alignItems='center'
                            key={documentLoader.name}
                            onClick={() => onDocLoaderSelected(documentLoader.name)}
                            sx={{
                                border: 1,
                                borderColor: theme.palette.grey[900] + 25,
                                borderRadius: 2,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'start',
                                textAlign: 'left',
                                gap: 1,
                                p: 2
                            }}
                        >
                            <div
                                style={{
                                    width: 50,
                                    height: 50,
                                    borderRadius: '50%',
                                    backgroundColor: 'white'
                                }}
                            >
                                <img
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        padding: 7,
                                        borderRadius: '50%',
                                        objectFit: 'contain'
                                    }}
                                    alt={documentLoader.name}
                                    src={`${baseURL}/api/v1/node-icon/${documentLoader.name}`}
                                />
                            </div>
                            <Typography>{documentLoader.label}</Typography>
                        </ListItemButton>
                    ))}
                </List>
            </DialogContent>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

DocumentLoaderListDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func,
    onDocLoaderSelected: PropTypes.func
}

export default DocumentLoaderListDialog
