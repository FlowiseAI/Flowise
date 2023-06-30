import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import DeleteIcon from '@mui/icons-material/Delete'
import FilterListIcon from '@mui/icons-material/FilterList'
import PropTypes from 'prop-types'
import { alpha } from '@mui/material/styles'
import { SearchingField } from 'ui-component/input/SearchingField'
import Grid from '@mui/material/Unstable_Grid2'

export function ChatLogsTableToolbar(props) {
    const { numSelected } = props

    return (
        <Toolbar>
            <Grid container xs={12}>
                <Grid container xs={12} sm={12}>
                    <SearchingField />
                    <IconButton>
                        <FilterListIcon />
                    </IconButton>
                </Grid>

                <Grid
                    alignItems='center'
                    sm={12}
                    sx={{
                        mt: 1,
                        pl: { sm: 2 },
                        pr: { xs: 1, sm: 1 }
                        // ...(numSelected > 0 && {
                        //     bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.action.activatedOpacity)
                        // })
                    }}
                >
                    {numSelected > 0 ? (
                        <Typography sx={{ flex: '1 0 auto' }} color='inherit' variant='subtitle1' component='span'>
                            {numSelected} selected
                        </Typography>
                    ) : (
                        <Typography sx={{ flex: '1 0 auto' }} variant='h6' id='tableTitle' component='div'></Typography>
                    )}

                    {/* {numSelected > 0 && (
                        <Tooltip title='Delete'>
                            <IconButton>
                                <DeleteIcon />
                            </IconButton>
                        </Tooltip>
                    )} */}
                </Grid>
            </Grid>
        </Toolbar>
    )
}

ChatLogsTableToolbar.propTypes = {
    numSelected: PropTypes.number.isRequired
}
