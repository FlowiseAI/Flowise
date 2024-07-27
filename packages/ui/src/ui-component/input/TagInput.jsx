import PropTypes from 'prop-types'
import { useState, useEffect } from 'react'
import { Box, Typography, Chip, Autocomplete, TextField, CircularProgress } from '@mui/material'
import chatflowsApi from '@/api/chatflows'

const TagInput = ({ categories, onChange }) => {
    const [inputValue, setInputValue] = useState('')
    const [allTags, setAllTags] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchAllTags()
    }, [])

    const fetchAllTags = async () => {
        try {
            setLoading(true)
            const response = await chatflowsApi.getAllChatflows()
            const chatflows = response.data
            const uniqueTags = [...new Set(chatflows.flatMap((chatflow) => (chatflow.category ? chatflow.category.split(';') : [])))]
            setAllTags(uniqueTags)
        } catch (error) {
            console.error('Failed to fetch tags:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleTagChange = (event, newValue) => {
        if (typeof onChange === 'function') {
            onChange(newValue)
        } else {
            console.warn('onChange prop is not a function')
        }
    }

    const handleInputChange = (event, newInputValue) => {
        setInputValue(newInputValue)
    }

    // Filter out already selected tags
    const availableTags = allTags.filter((tag) => !categories.includes(tag))

    return (
        <Box>
            <Autocomplete
                multiple
                id='tags-filled'
                options={availableTags}
                value={categories}
                onChange={handleTagChange}
                inputValue={inputValue}
                onInputChange={handleInputChange}
                freeSolo
                renderTags={(value, getTagProps) =>
                    value.map((option, index) => <Chip key={option} variant='outlined' label={option} {...getTagProps({ index })} />)
                }
                renderInput={(params) => (
                    <TextField
                        {...params}
                        variant='outlined'
                        label='Add a category'
                        placeholder='Type or select a category'
                        InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                                <>
                                    {loading ? <CircularProgress color='inherit' size={20} /> : null}
                                    {params.InputProps.endAdornment}
                                </>
                            )
                        }}
                    />
                )}
                loading={loading}
                filterOptions={(options, params) => {
                    const filtered = options.filter((option) => option.toLowerCase().includes(params.inputValue.toLowerCase()))
                    if (params.inputValue !== '' && !filtered.includes(params.inputValue) && !categories.includes(params.inputValue)) {
                        filtered.push(params.inputValue)
                    }
                    return filtered
                }}
            />
            <Typography variant='body2' sx={{ fontStyle: 'italic', mt: 1 }} color='text.secondary'>
                Select from existing categories or type a new one and press enter to add it to the list.
            </Typography>
        </Box>
    )
}

TagInput.propTypes = {
    categories: PropTypes.arrayOf(PropTypes.string).isRequired,
    onChange: PropTypes.func.isRequired
}

export default TagInput
