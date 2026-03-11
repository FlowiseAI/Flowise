import { Box, FormControl, MenuItem, Pagination, Select, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { useTheme } from '@mui/material/styles'
import { useConfigContext } from '../infrastructure/store/ConfigContext'

export const DEFAULT_ITEMS_PER_PAGE = 12

interface TablePaginationProps {
    currentPage: number
    limit: number
    total: number
    onChange: (page: number, limit: number) => void
}

const TablePagination = ({ currentPage, limit, total, onChange }: TablePaginationProps) => {
    const theme = useTheme()
    const config = useConfigContext()
    const borderColor = theme.palette.grey[900] + 25

    const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE)
    const [activePage, setActivePage] = useState(1)
    const [totalItems, setTotalItems] = useState(0)

    useEffect(() => {
        setTotalItems(total)
    }, [total])

    useEffect(() => {
        setItemsPerPage(limit)
    }, [limit])

    useEffect(() => {
        setActivePage(currentPage)
    }, [currentPage])

    const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
        setActivePage(value)
        onChange(value, itemsPerPage)
    }

    const handleLimitChange = (event: { target: { value: string } }) => {
        const newItemsPerPage = parseInt(event.target.value, 10)
        setItemsPerPage(newItemsPerPage)
        setActivePage(1)
        onChange(1, newItemsPerPage)
    }

    return (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant='body2'>Items per page:</Typography>
                <FormControl
                    variant='outlined'
                    size='small'
                    sx={{
                        minWidth: 80,
                        '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: borderColor
                        },
                        '& .MuiSvgIcon-root': {
                            color: config.isDarkMode ? '#fff' : 'inherit'
                        }
                    }}
                >
                    <Select value={String(itemsPerPage)} onChange={handleLimitChange} displayEmpty>
                        <MenuItem value={12}>12</MenuItem>
                        <MenuItem value={24}>24</MenuItem>
                        <MenuItem value={48}>48</MenuItem>
                        <MenuItem value={100}>100</MenuItem>
                    </Select>
                </FormControl>
            </Box>
            {totalItems > 0 && (
                <Typography variant='body2'>
                    Items {activePage * itemsPerPage - itemsPerPage + 1} to{' '}
                    {activePage * itemsPerPage > totalItems ? totalItems : activePage * itemsPerPage} of {totalItems}
                </Typography>
            )}
            <Pagination count={Math.ceil(totalItems / itemsPerPage)} onChange={handlePageChange} page={activePage} color='primary' />
        </Box>
    )
}

export default TablePagination
