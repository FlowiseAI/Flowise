import { useState, useRef, useEffect, memo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import PropTypes from 'prop-types'

import { Typography, Box, ClickAwayListener, Paper, Popper, Button } from '@mui/material'
import { useTheme, alpha, lighten, darken } from '@mui/material/styles'
import { IconCheckbox, IconMessage, IconX, IconExclamationCircle, IconChecklist } from '@tabler/icons-react'

// project import
import { StyledFab } from '@/ui-component/button/StyledFab'
import MainCard from '@/ui-component/cards/MainCard'
import Transitions from '@/ui-component/extended/Transitions'
import validate_empty from '@/assets/images/validate_empty.svg'

// api
import validationApi from '@/api/validation'

// Hooks
import useNotifier from '@/utils/useNotifier'

// Const
import { enqueueSnackbar as enqueueSnackbarAction } from '@/store/actions'
import { AGENTFLOW_ICONS } from '@/store/constant'

// Utils

const ValidationPopUp = ({ chatflowid, hidden }) => {
    const theme = useTheme()
    const dispatch = useDispatch()
    const customization = useSelector((state) => state.customization)

    useNotifier()
    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))

    const [open, setOpen] = useState(false)
    const [previews, setPreviews] = useState([])
    const [loading, setLoading] = useState(false)

    const anchorRef = useRef(null)
    const prevOpen = useRef(open)

    const handleClose = (event) => {
        if (anchorRef.current && anchorRef.current.contains(event.target)) {
            return
        }
        setOpen(false)
    }

    const handleToggle = () => {
        setOpen((prevOpen) => !prevOpen)
    }

    const validateFlow = async () => {
        if (!chatflowid) return

        try {
            setLoading(true)
            const response = await validationApi.checkValidation(chatflowid)
            setPreviews(response.data)

            if (response.data.length === 0) {
                enqueueSnackbar({
                    message: 'No issues found in your flow!',
                    options: {
                        key: new Date().getTime() + Math.random(),
                        variant: 'success',
                        autoHideDuration: 3000
                    }
                })
            }
        } catch (error) {
            console.error(error)
            enqueueSnackbar({
                message: error.message || 'Failed to validate flow',
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'error',
                    autoHideDuration: 3000
                }
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (prevOpen.current === true && open === false) {
            anchorRef.current.focus()
        }
        prevOpen.current = open

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, chatflowid])

    const getNodeIcon = (item) => {
        // Extract node name from the item
        const nodeName = item.name

        // Find matching icon from AGENTFLOW_ICONS
        const foundIcon = AGENTFLOW_ICONS.find((icon) => icon.name === nodeName)

        if (foundIcon) {
            return (
                <Box
                    sx={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '4px',
                        backgroundColor: foundIcon.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white'
                    }}
                >
                    <foundIcon.icon size={16} />
                </Box>
            )
        }

        // Default icon if no match found
        return (
            <Box
                sx={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '4px',
                    backgroundColor: item.type === 'LLM' ? '#4747d1' : '#f97316',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                }}
            >
                {item.type === 'LLM' ? <span>ℓ</span> : <IconMessage size={16} />}
            </Box>
        )
    }

    return (
        <>
            {!hidden && (
                <StyledFab
                    sx={{ position: 'absolute', right: 80, top: 20 }}
                    ref={anchorRef}
                    size='small'
                    color='teal'
                    aria-label='validation'
                    title='Validate Nodes'
                    onClick={handleToggle}
                >
                    {open ? <IconX /> : <IconChecklist />}
                </StyledFab>
            )}

            <Popper
                placement='bottom-end'
                open={open && !hidden}
                anchorEl={anchorRef.current}
                role={undefined}
                transition
                disablePortal
                popperOptions={{
                    modifiers: [
                        {
                            name: 'offset',
                            options: {
                                offset: [80, 14]
                            }
                        }
                    ]
                }}
                sx={{ zIndex: 1000 }}
            >
                {({ TransitionProps }) => (
                    <Transitions in={open} {...TransitionProps}>
                        <Paper>
                            <ClickAwayListener onClickAway={handleClose}>
                                <MainCard
                                    elevation={16}
                                    border={false}
                                    content={false}
                                    sx={{
                                        p: 2,
                                        width: '400px',
                                        maxWidth: '100%'
                                    }}
                                    boxShadow
                                    shadow={theme.shadows[16]}
                                >
                                    <Typography variant='h4' sx={{ mt: 1, mb: 2 }}>
                                        Checklist ({previews.length})
                                    </Typography>

                                    <Box
                                        sx={{
                                            maxHeight: '60vh',
                                            overflowY: 'auto',
                                            pr: 1, // Add some padding to the right to account for scrollbar
                                            mr: -1 // Negative margin to compensate for the padding
                                        }}
                                    >
                                        {previews.length > 0 ? (
                                            previews.map((item, index) => (
                                                <Paper
                                                    key={index}
                                                    elevation={0}
                                                    sx={{
                                                        p: 2,
                                                        mb: 2,
                                                        backgroundColor: customization.isDarkMode
                                                            ? theme.palette.background.paper
                                                            : theme.palette.background.neutral,
                                                        borderRadius: '8px',
                                                        border: `1px solid ${alpha('#FFB938', customization.isDarkMode ? 0.3 : 0.5)}`
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                                        {getNodeIcon(item)}
                                                        <div style={{ fontWeight: 500 }}>{item.label || item.name}</div>
                                                    </div>

                                                    <Box sx={{ mt: 2 }}></Box>

                                                    {item.issues.map((issue, issueIndex) => (
                                                        <Box
                                                            key={issueIndex}
                                                            sx={{
                                                                pt: 2,
                                                                px: 2,
                                                                pb: issueIndex === item.issues.length - 1 ? 2 : 1,
                                                                backgroundColor: customization.isDarkMode
                                                                    ? darken('#FFB938', 0.85)
                                                                    : lighten('#FFB938', 0.9),
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 2
                                                            }}
                                                        >
                                                            <IconExclamationCircle
                                                                color='#FFB938'
                                                                size={20}
                                                                style={{
                                                                    minWidth: '20px',
                                                                    width: '20px',
                                                                    height: '20px',
                                                                    flexShrink: 0
                                                                }}
                                                            />
                                                            <span>{issue}</span>
                                                        </Box>
                                                    ))}
                                                </Paper>
                                            ))
                                        ) : (
                                            <Box
                                                sx={{
                                                    p: 2,
                                                    height: 'auto',
                                                    display: 'flex',
                                                    justifyContent: 'center',
                                                    alignItems: 'center'
                                                }}
                                            >
                                                <img
                                                    style={{ objectFit: 'cover', height: '15vh', width: 'auto' }}
                                                    src={validate_empty}
                                                    alt='validate_empty'
                                                />
                                            </Box>
                                        )}
                                    </Box>

                                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, mb: 1 }}>
                                        <Button
                                            variant='contained'
                                            color='teal'
                                            onClick={validateFlow}
                                            disabled={loading}
                                            startIcon={loading ? null : <IconCheckbox size={18} />}
                                            sx={{ color: 'white', minWidth: '120px' }}
                                        >
                                            {loading ? 'Validating...' : 'Validate Flow'}
                                        </Button>
                                    </Box>
                                </MainCard>
                            </ClickAwayListener>
                        </Paper>
                    </Transitions>
                )}
            </Popper>
        </>
    )
}

ValidationPopUp.propTypes = {
    chatflowid: PropTypes.string,
    hidden: PropTypes.bool
}

export default memo(ValidationPopUp)
