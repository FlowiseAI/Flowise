import * as React from 'react'
import { styled } from '@mui/material/styles'
import Box from '@mui/material/Box'
import Slider from '@mui/material/Slider'
import { Grid, Input } from '@mui/material'

const BoxShadow = '0 3px 1px rgba(0,0,0,0.1),0 4px 8px rgba(0,0,0,0.13),0 0 0 1px rgba(0,0,0,0.02)'

const CustomInputSlider = styled(Slider)(({ theme }) => ({
    color: theme.palette.mode === 'dark' ? '#0a84ff' : '#007bff',
    height: 5,
    padding: '15px 0',
    '& .MuiSlider-thumb': {
        height: 20,
        width: 20,
        backgroundColor: '#fff',
        boxShadow: '0 0 2px 0px rgba(0, 0, 0, 0.1)',
        '&:focus, &:hover, &.Mui-active': {
            boxShadow: '0px 0px 3px 1px rgba(0, 0, 0, 0.1)',
            // Reset on touch devices, it doesn't add specificity
            '@media (hover: none)': {
                boxShadow: BoxShadow
            }
        },
        '&:before': {
            boxShadow: '0px 0px 1px 0px rgba(0,0,0,0.2), 0px 0px 0px 0px rgba(0,0,0,0.14), 0px 0px 1px 0px rgba(0,0,0,0.12)'
        }
    },
    '& .MuiSlider-valueLabel': {
        fontSize: 12,
        fontWeight: 'normal',
        top: -1,
        backgroundColor: 'unset',
        color: theme.palette.text.primary,
        '&::before': {
            display: 'none'
        },
        '& *': {
            background: 'transparent',
            color: theme.palette.mode === 'dark' ? '#fff' : '#000'
        }
    },
    '& .MuiSlider-track': {
        border: 'none',
        height: 5
    },
    '& .MuiSlider-rail': {
        opacity: 0.5,
        boxShadow: 'inset 0px 0px 4px -2px #000',
        backgroundColor: '#d0d0d0'
    }
}))

export const InputSlider = (initialValue) => {
    const [value, setValue] = React.useState(initialValue)

    const handleSliderChange = (event, newValue) => {
        setValue(newValue)
    }

    const handleInputChange = (event) => {
        setValue(event.target.value === '' ? 0 : Number(event.target.value))
    }

    const handleBlur = () => {
        if (value < 0) {
            setValue(0)
        } else if (value > 100) {
            setValue(100)
        }
    }

    return (
        <Box sx={{ width: '100%' }}>
            <Grid container spacing={2} sx={{ mt: 1 }} alignItems='center'>
                <Grid item xs>
                    <CustomInputSlider
                        value={typeof value === 'number' ? value : 0}
                        onChange={handleSliderChange}
                        valueLabelDisplay='on'
                        aria-labelledby='input-slider'
                        step={10}
                        min={0}
                        max={5000}
                    />
                </Grid>
                <Grid item>
                    <Input
                        sx={{ ml: 3, mr: 3 }}
                        value={value}
                        size='small'
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        inputProps={{
                            step: 10,
                            min: 0,
                            max: 10000,
                            type: 'number',
                            'aria-labelledby': 'input-slider'
                        }}
                    />
                </Grid>
            </Grid>
        </Box>
    )
}
