import { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import PropTypes from 'prop-types'
import PerfectScrollbar from 'react-perfect-scrollbar'
import { List, ListItemButton, Box, InputAdornment, Typography } from '@mui/material'

// components
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

import { useTheme } from '@mui/material/styles'
import { IconSearch, IconX } from '@tabler/icons-react'

// API
import documentStoreApi from '@/api/documentstore'

// const
import { baseURL } from '@/store/constant'
import { HIDE_CANVAS_DIALOG, SHOW_CANVAS_DIALOG } from '@/store/actions'
import useApi from '@/hooks/useApi'

const DocumentLoaderListDialog = ({ show, dialogProps, onCancel, onDocLoaderSelected }) => {
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

    return (
        <Dialog disableRestoreFocus open={show} onClose={onCancel}>
            <DialogContent className='max-w-[64rem] h-[75vh] overflow-hidden flex flex-col justify-start'>
                <DialogHeader>
                    <DialogTitle>{dialogProps.title}</DialogTitle>
                </DialogHeader>
                <Box className='w-full flex flex-col justify-start gap-4 relative'>
                    <Box className='sticky top-0'>
                        <Input
                            // eslint-disable-next-line jsx-a11y/no-autofocus
                            autoFocus
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
                        />
                    </Box>
                    <PerfectScrollbar className='h-full max-h-[70vh] overflow-x-hidden'>
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
                    </PerfectScrollbar>
                </Box>
            </DialogContent>
        </Dialog>
    )
}

DocumentLoaderListDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func,
    onDocLoaderSelected: PropTypes.func
}

export default DocumentLoaderListDialog
