import PropTypes from 'prop-types'

// material-ui
import { Box, OutlinedInput, Toolbar, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'

// icons
import { IconSearch } from '@tabler/icons'

const ViewHeader = ({ children, filters = null, onSearchChange, search, searchPlaceholder = 'Search', title }) => {
    const theme = useTheme()

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
                <Typography
                    sx={{
                        fontSize: '2rem',
                        fontWeight: 600
                    }}
                    variant='h1'
                >
                    {title}
                </Typography>
                <Box sx={{ height: 40, display: 'flex', alignItems: 'center', gap: 1 }}>
                    {search && (
                        <OutlinedInput
                            size='small'
                            sx={{
                                width: '280px',
                                height: '100%',
                                display: { xs: 'none', sm: 'flex' },
                                borderRadius: 2,

                                '& .MuiOutlinedInput-notchedOutline': {
                                    borderRadius: 2
                                }
                            }}
                            variant='outlined'
                            placeholder={searchPlaceholder}
                            onChange={onSearchChange}
                            startAdornment={
                                <Box
                                    sx={{
                                        color: theme.palette.grey[400],
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        mr: 1
                                    }}
                                >
                                    <IconSearch style={{ color: 'inherit', width: 16, height: 16 }} />
                                </Box>
                            }
                            type='search'
                        />
                    )}
                    {filters}
                    {children}
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
    title: PropTypes.string
}

export default ViewHeader
