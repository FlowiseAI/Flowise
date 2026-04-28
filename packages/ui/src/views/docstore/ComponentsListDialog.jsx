import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useSelector, useDispatch } from 'react-redux'
import PropTypes from 'prop-types'
import { List, ListItemButton, Dialog, DialogContent, DialogTitle, Box, OutlinedInput, InputAdornment, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { IconSearch, IconX } from '@tabler/icons-react'

// API

// const
import { baseURL } from '@/store/constant'
import { HIDE_CANVAS_DIALOG, SHOW_CANVAS_DIALOG } from '@/store/actions'
import useApi from '@/hooks/useApi'

const ComponentsListDialog = ({ show, dialogProps, onCancel, apiCall, onSelected }) => {
    const portalElement = document.getElementById('portal')
    const customization = useSelector((state) => state.customization)
    const dispatch = useDispatch()
    const theme = useTheme()
    const [searchValue, setSearchValue] = useState('')
    const [provider, setProvider] = useState([])

    const getProvidersApi = useApi(apiCall)

    const onSearchChange = (val) => {
        setSearchValue(val)
    }

    function filterFlows(data) {
        return data?.name?.toLowerCase().indexOf(searchValue.toLowerCase()) > -1
    }

    useEffect(() => {
        // if (dialogProps.embeddingsProvider) {
        //     setProvider(dialogProps.provider)
        // }
    }, [dialogProps])

    useEffect(() => {
        getProvidersApi.request()

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (getProvidersApi.data) {
            setProvider(getProvidersApi.data)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getProvidersApi.data])

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
                        backgroundColor: customization.isDarkMode ? theme.palette.background.darkPaper : theme.palette.background.paper,
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
                    {[...provider].filter(filterFlows).map((loader) => (
                        <ListItemButton
                            alignItems='center'
                            key={loader.name}
                            onClick={() => onSelected(loader)}
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
                                    backgroundColor: 'white',
                                    flexShrink: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
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
                                    alt={loader.name}
                                    src={`${baseURL}/api/v1/node-icon/${loader.name}`}
                                />
                            </div>
                            <Typography>{loader.label}</Typography>
                        </ListItemButton>
                    ))}
                </List>
            </DialogContent>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

ComponentsListDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func,
    apiCall: PropTypes.func,
    onSelected: PropTypes.func
}

export default ComponentsListDialog
