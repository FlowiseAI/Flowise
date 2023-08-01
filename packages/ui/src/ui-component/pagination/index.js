import { Grid, MenuItem, Pagination, Select, Typography } from '@mui/material'
import PropTypes from 'prop-types'

export function CustomPagination({ perPage, page, count, pageSizes, onChange, onChangePerPage }) {
    const handleChangePerPage = (event) => onChangePerPage(Number(event.target.value))

    return (
        <Grid container alignItems='center' justifyContent='flex-end' gap='1rem'>
            <Typography>Rows per page:</Typography>
            <Select
                variant='standard'
                labelId='per-page-select-label'
                id='per-page-select'
                value={String(perPage)}
                onChange={handleChangePerPage}
            >
                {pageSizes.map((size) => (
                    <MenuItem key={size} value={size}>
                        {size}
                    </MenuItem>
                ))}
            </Select>
            <Pagination count={count} page={page} onChange={onChange} showFirstButton showLastButton />
        </Grid>
    )
}

CustomPagination.propTypes = {
    perPage: PropTypes.number.isRequired,
    total: PropTypes.number.isRequired,
    page: PropTypes.number.isRequired,
    count: PropTypes.number.isRequired,
    onChange: PropTypes.func.isRequired,
    onChangePerPage: PropTypes.func.isRequired,
    pageSizes: PropTypes.arrayOf(PropTypes.number)
}
