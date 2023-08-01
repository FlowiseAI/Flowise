import { useEffect, useState } from 'react'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import PropTypes from 'prop-types'
import { SearchingField } from 'ui-component/input/SearchField'
import Grid from '@mui/material/Unstable_Grid2'
import { useDebounce } from 'hooks/useDebounce'

export function ChainLogsTableToolbar(props) {
    const { numSelected, onChangeTerm } = props

    const [value, setValue] = useState('')
    const debouncedValue = useDebounce(value, 500)

    const handleChange = (event) => {
        setValue(event.target.value)
    }

    useEffect(() => {
        onChangeTerm(value)
    }, [debouncedValue])

    return (
        <Toolbar>
            <Grid container xs={12}>
                <Grid container xs={12} sm={12}>
                    <SearchingField onChange={handleChange} />
                </Grid>

                <Grid
                    alignItems='center'
                    sm={12}
                    sx={{
                        mt: 1,
                        pl: { sm: 2 },
                        pr: { xs: 1, sm: 1 }
                    }}
                >
                    {numSelected > 0 ? (
                        <Typography sx={{ flex: '1 0 auto' }} color='inherit' variant='subtitle1' component='span'>
                            {numSelected} selected
                        </Typography>
                    ) : (
                        <Typography sx={{ flex: '1 0 auto' }} variant='h6' id='tableTitle' component='div'></Typography>
                    )}
                </Grid>
            </Grid>
        </Toolbar>
    )
}

ChainLogsTableToolbar.propTypes = {
    numSelected: PropTypes.number.isRequired,
    onChangeTerm: PropTypes.func
}
