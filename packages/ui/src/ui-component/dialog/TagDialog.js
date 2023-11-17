import { useState } from 'react'
import Dialog from '@mui/material/Dialog'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Chip from '@mui/material/Chip'
import PropTypes from 'prop-types'
import { DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material'

const TagDialog = ({ isOpen, onClose, tags, setTags, onSubmit }) => {
    const [inputValue, setInputValue] = useState('')

    const handleInputChange = (event) => {
        setInputValue(event.target.value)
    }

    const handleInputKeyDown = (event) => {
        if (event.key === 'Enter' && inputValue.trim()) {
            event.preventDefault()
            if (!tags.includes(inputValue)) {
                setTags([...tags, inputValue])
                setInputValue('')
            }
        }
    }

    const handleDeleteTag = (tagToDelete) => {
        setTags(tags.filter((tag) => tag !== tagToDelete))
    }

    const handleSubmit = (event) => {
        event.preventDefault()
        if (inputValue.trim() && !tags.includes(inputValue)) {
            setTags([...tags, inputValue])
        }
        onSubmit(tags)
        onClose()
    }

    return (
        <Dialog
            fullWidth
            maxWidth='xs'
            open={isOpen}
            onClose={onClose}
            aria-labelledby='tag-dialog-title'
            aria-describedby='tag-dialog-description'
        >
            <DialogTitle sx={{ fontSize: '1rem' }} id='alert-dialog-title'>
                Set Chatflow Category Tags
            </DialogTitle>
            <DialogContent>
                <Box>
                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: 20 }}>
                            {tags.map((tag, index) => (
                                <Chip
                                    key={index}
                                    label={tag}
                                    onDelete={() => handleDeleteTag(tag)}
                                    style={{ marginRight: 5, marginBottom: 5 }}
                                />
                            ))}
                        </div>
                        <TextField
                            fullWidth
                            value={inputValue}
                            onChange={handleInputChange}
                            onKeyDown={handleInputKeyDown}
                            label='Add a tag'
                            variant='outlined'
                        />
                        <Typography variant='body2' sx={{ fontStyle: 'italic' }} color='text.secondary'>
                            Enter a tag and press enter to add it to the list. You can add as many tags as you want.
                        </Typography>
                    </form>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button variant='contained' onClick={handleSubmit}>
                    Submit
                </Button>
            </DialogActions>
        </Dialog>
    )
}

TagDialog.propTypes = {
    isOpen: PropTypes.bool,
    onClose: PropTypes.func,
    tags: PropTypes.array,
    setTags: PropTypes.func,
    onSubmit: PropTypes.func
}

export default TagDialog
