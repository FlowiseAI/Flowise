import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useSelector, useDispatch } from 'react-redux'
import PropTypes from 'prop-types'
import {
    List,
    ListItemButton,
    ListItem,
    ListItemAvatar,
    ListItemText,
    Dialog,
    DialogContent,
    DialogTitle,
    Box,
    OutlinedInput,
    InputAdornment
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { IconSearch, IconX } from '@tabler/icons'

// const
import { baseURL } from 'store/constant'
import { HIDE_CANVAS_DIALOG, SHOW_CANVAS_DIALOG } from 'store/actions'

const CredentialListDialog = ({ show, dialogProps, onCancel, onCredentialSelected }) => {
    const portalElement = document.getElementById('portal')
    const customization = useSelector((state) => state.customization)
    const dispatch = useDispatch()
    const theme = useTheme()
    const [searchValue, setSearchValue] = useState('')
    const [componentsCredentials, setComponentsCredentials] = useState([])

    const filterSearch = (value) => {
        setSearchValue(value)
        setTimeout(() => {
            if (value) {
                const searchData = dialogProps.componentsCredentials.filter((crd) => crd.name.toLowerCase().includes(value.toLowerCase()))
                setComponentsCredentials(searchData)
            } else if (value === '') {
                setComponentsCredentials(dialogProps.componentsCredentials)
            }
            // scrollTop()
        }, 500)
    }

    useEffect(() => {
        if (dialogProps.componentsCredentials) {
            setComponentsCredentials(dialogProps.componentsCredentials)
        }
    }, [dialogProps])

    useEffect(() => {
        if (show) dispatch({ type: SHOW_CANVAS_DIALOG })
        else dispatch({ type: HIDE_CANVAS_DIALOG })
        return () => dispatch({ type: HIDE_CANVAS_DIALOG })
    }, [show, dispatch])

    const component = show ? (
        <Dialog
            fullWidth
            maxWidth='xs'
            open={show}
            onClose={onCancel}
            aria-labelledby='alert-dialog-title'
            aria-describedby='alert-dialog-description'
        >
            <DialogTitle sx={{ fontSize: '1rem' }} id='alert-dialog-title'>
                {dialogProps.title}
                <Box sx={{ p: 2 }}>
                    <OutlinedInput
                        sx={{ width: '100%', pr: 2, pl: 2, my: 2 }}
                        id='input-search-credential'
                        value={searchValue}
                        onChange={(e) => filterSearch(e.target.value)}
                        placeholder='Search credential'
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
                                    onClick={() => filterSearch('')}
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
            </DialogTitle>
            <DialogContent>
                <List
                    sx={{
                        width: '100%',
                        py: 0,
                        borderRadius: '10px',
                        [theme.breakpoints.down('md')]: {
                            maxWidth: 370
                        },
                        '& .MuiListItemSecondaryAction-root': {
                            top: 22
                        },
                        '& .MuiDivider-root': {
                            my: 0
                        },
                        '& .list-container': {
                            pl: 7
                        }
                    }}
                >
                    {[...componentsCredentials].map((componentCredential) => (
                        <div key={componentCredential.name}>
                            <ListItemButton
                                onClick={() => onCredentialSelected(componentCredential)}
                                sx={{ p: 0, borderRadius: `${customization.borderRadius}px` }}
                            >
                                <ListItem alignItems='center'>
                                    <ListItemAvatar>
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
                                                alt={componentCredential.name}
                                                src={`${baseURL}/api/v1/components-credentials-icon/${componentCredential.name}`}
                                            />
                                        </div>
                                    </ListItemAvatar>
                                    <ListItemText sx={{ ml: 1 }} primary={componentCredential.label} />
                                </ListItem>
                            </ListItemButton>
                        </div>
                    ))}
                </List>
            </DialogContent>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

CredentialListDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func,
    onCredentialSelected: PropTypes.func
}

export default CredentialListDialog
