import PropTypes from 'prop-types'

// material-ui
import { Box, ButtonGroup, InputAdornment, TextField, Toolbar, Typography } from '@mui/material'

// icons
import { IconSearch } from '@tabler/icons'

const ViewHeader = ({ children, filters = null, onSearchChange, search, title }) => {
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {search && (
                        <TextField
                            size='small'
                            sx={{ display: { xs: 'none', sm: 'block' }, borderRadius: 2 }}
                            variant='outlined'
                            placeholder='Search name or category'
                            onChange={onSearchChange}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position='start'>
                                        <IconSearch />
                                    </InputAdornment>
                                ),
                                sx: {
                                    borderRadius: 2
                                }
                            }}
                        />
                    )}
                    {filters}
                    <ButtonGroup
                        sx={{ display: 'flex', alignItems: 'center', gap: 1, maxHeight: 40 }}
                        disableElevation
                        variant='contained'
                        aria-label='outlined primary button group'
                    >
                        {children}
                    </ButtonGroup>
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
    title: PropTypes.string
}

export default ViewHeader
