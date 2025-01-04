import PropTypes from 'prop-types'
import { useRef } from 'react'

// material-ui
import { IconButton, Box, Toolbar, Typography } from '@mui/material'
import { StyledFab } from '@/ui-component/button/StyledFab'

// components
import { Input } from '@/components/ui/input'

// icons
import { IconArrowLeft, IconEdit } from '@tabler/icons-react'

import useSearchShorcut from '@/hooks/useSearchShortcut'
import { getOS } from '@/utils/genericHelper'

const os = getOS()
const isMac = os === 'macos'
const isDesktop = isMac || os === 'windows' || os === 'linux'
const keyboardShortcut = isMac ? '⌘ F' : 'Ctrl F'

const ViewHeader = ({
    children,
    filters = null,
    onSearchChange,
    search,
    searchPlaceholder = 'Search',
    title,
    description,
    isBackButton,
    onBack,
    isEditButton,
    onEdit
}) => {
    const searchInputRef = useRef()
    useSearchShorcut(searchInputRef)

    return (
        <Box sx={{ flexGrow: 1, py: 1.25, width: '100%' }}>
            <Toolbar
                disableGutters={true}
                sx={{
                    p: 0,
                    display: 'flex',
                    justifyContent: 'space-between',
                    width: '100%'
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', flexDirection: 'row' }}>
                    {isBackButton && (
                        <StyledFab sx={{ mr: 3 }} size='small' color='secondary' aria-label='back' title='Back' onClick={onBack}>
                            <IconArrowLeft />
                        </StyledFab>
                    )}
                    <Box sx={{ display: 'flex', alignItems: 'start', flexDirection: 'column' }}>
                        <Typography
                            className='text-2xl font-semibold'
                            sx={{
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                                textOverflow: 'ellipsis',
                                overflow: 'hidden',
                                flex: 1,
                                maxWidth: 'calc(100vh - 100px)'
                            }}
                            variant='h1'
                        >
                            {title}
                        </Typography>
                        {description && (
                            <Typography
                                className='text-base font-normal mt-2'
                                sx={{
                                    display: '-webkit-box',
                                    WebkitLineClamp: 5,
                                    WebkitBoxOrient: 'vertical',
                                    textOverflow: 'ellipsis',
                                    overflow: 'hidden',
                                    flex: 1,
                                    maxWidth: 'calc(100vh - 100px)'
                                }}
                            >
                                {description}
                            </Typography>
                        )}
                    </Box>
                    {isEditButton && (
                        <IconButton sx={{ ml: 3 }} color='secondary' title='Edit' onClick={onEdit}>
                            <IconEdit />
                        </IconButton>
                    )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {search && (
                        <Input
                            className='w-[325px]'
                            onChange={onSearchChange}
                            placeholder={`${searchPlaceholder}`}
                            ref={searchInputRef}
                            shortcut={isDesktop ? keyboardShortcut : null}
                            size='sm'
                        />
                    )}
                    {children}
                    {filters}
                </Box>
            </Toolbar>
        </Box>
    )
}

ViewHeader.propTypes = {
    children: PropTypes.node,
    filters: PropTypes.node,
    onSearchChange: PropTypes.func,
    search: PropTypes.bool,
    searchPlaceholder: PropTypes.string,
    title: PropTypes.string,
    description: PropTypes.string,
    isBackButton: PropTypes.bool,
    onBack: PropTypes.func,
    isEditButton: PropTypes.bool,
    onEdit: PropTypes.func
}

export default ViewHeader
