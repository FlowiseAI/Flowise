import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import { Typography } from '@mui/material'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

const TagDialog = ({ isOpen, dialogProps, onClose, onSubmit }) => {
    const [inputValue, setInputValue] = useState('')
    const [categoryValues, setCategoryValues] = useState([])

    const handleInputChange = (event) => {
        setInputValue(event.target.value)
    }

    const handleInputKeyDown = (event) => {
        if (event.key === 'Enter' && inputValue.trim()) {
            event.preventDefault()
            if (!categoryValues.includes(inputValue)) {
                setCategoryValues([...categoryValues, inputValue])
                setInputValue('')
            }
        }
    }

    const handleDeleteTag = (categoryToDelete) => {
        setCategoryValues(categoryValues.filter((category) => category !== categoryToDelete))
    }

    const handleSubmit = (event) => {
        event.preventDefault()
        let newCategories = [...categoryValues]
        if (inputValue.trim() && !categoryValues.includes(inputValue)) {
            newCategories = [...newCategories, inputValue]
            setCategoryValues(newCategories)
        }
        onSubmit(newCategories)
    }

    useEffect(() => {
        if (dialogProps.category) setCategoryValues(dialogProps.category)

        return () => {
            setInputValue('')
            setCategoryValues([])
        }
    }, [dialogProps])

    return (
        <Dialog disableRestoreFocus open={isOpen} onClose={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Set Chatflow Category Tags</DialogTitle>
                </DialogHeader>
                <Box className='mt-2'>
                    <form onSubmit={handleSubmit}>
                        {categoryValues.length > 0 && (
                            <div style={{ marginBottom: 10 }}>
                                {categoryValues.map((category, index) => (
                                    <Chip
                                        key={index}
                                        label={category}
                                        onDelete={() => handleDeleteTag(category)}
                                        style={{ marginRight: 5, marginBottom: 5 }}
                                    />
                                ))}
                            </div>
                        )}
                        <Input
                            // eslint-disable-next-line jsx-a11y/no-autofocus
                            autoFocus
                            onChange={handleInputChange}
                            onKeyDown={handleInputKeyDown}
                            placeholder='Add a tag'
                            value={inputValue}
                        />
                        <Typography variant='body2' sx={{ fontStyle: 'italic', mt: 1 }} color='text.secondary'>
                            Enter a tag and press enter to add it to the list. You can add as many tags as you want.
                        </Typography>
                    </form>
                </Box>
                <DialogFooter>
                    <Button onClick={onClose} size='sm' variant='ghost'>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} size='sm'>
                        Submit
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

TagDialog.propTypes = {
    isOpen: PropTypes.bool,
    dialogProps: PropTypes.object,
    onClose: PropTypes.func,
    onSubmit: PropTypes.func
}

export default TagDialog
