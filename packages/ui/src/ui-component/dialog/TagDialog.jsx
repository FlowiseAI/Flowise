import { useState, useEffect } from 'react'
import Dialog from '@mui/material/Dialog'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import PropTypes from 'prop-types'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import TagInput from '@/ui-component/input/TagInput'

const TagDialog = ({ isOpen, dialogProps, onClose, onSubmit }) => {
    const [categories, setCategories] = useState([])

    useEffect(() => {
        if (dialogProps?.category) setCategories(dialogProps.category)

        return () => {
            setCategories([])
        }
    }, [dialogProps])

    const handleSubmit = (event) => {
        event.preventDefault()
        onSubmit(categories)
    }

    return (
        <Dialog
            fullWidth
            maxWidth='xs'
            open={isOpen}
            onClose={onClose}
            aria-labelledby='category-dialog-title'
            aria-describedby='category-dialog-description'
        >
            <DialogTitle sx={{ fontSize: '1rem' }} id='alert-dialog-title'>
                Set Chatflow Category Tags
            </DialogTitle>
            <DialogContent>
                <Box>
                    <form onSubmit={handleSubmit}>
                        <TagInput categories={categories} onChange={setCategories} />
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
    dialogProps: PropTypes.object,
    onClose: PropTypes.func,
    onSubmit: PropTypes.func
}

export default TagDialog
