import * as React from 'react'
import SearchIcon from '@mui/icons-material/Search'
import { Paper, InputAdornment, TextField } from '@mui/material'

export function SearchingField({ ...props }) {
    return (
        <Paper sx={{ p: '2px 4px', display: 'flex', alignItems: 'center', width: 400 }}>
            <TextField
                {...props}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position='start'>
                            <SearchIcon />
                        </InputAdornment>
                    )
                }}
                sx={{ flex: 1 }}
                size='sm'
                placeholder='Search'
                type='search'
            />
        </Paper>
    )
}
