import { useState, useEffect } from 'react'
import Dialog from '@mui/material/Dialog'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Chip from '@mui/material/Chip'
import PropTypes from 'prop-types'
import { DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material'

// i18n
import { useTranslation } from 'react-i18next'

const TagDialog = ({ isOpen, dialogProps, onClose, onSubmit }) => {
    const { t } = useTranslation()
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
        <Dialog
            fullWidth
            maxWidth='xs'
            open={isOpen}
            onClose={onClose}
            aria-labelledby='category-dialog-title'
            aria-describedby='category-dialog-description'
        >
            <DialogTitle sx={{ fontSize: '1rem' }} id='alert-dialog-title'>
                {t('components.dialogs.tag.title')}
            </DialogTitle>
            <DialogContent>
                <Box>
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
                        <TextField
                            sx={{ mt: 2 }}
                            fullWidth
                            value={inputValue}
                            onChange={handleInputChange}
                            onKeyDown={handleInputKeyDown}
                            label={t('components.dialogs.tag.addLabel')}
                            variant='outlined'
                        />
                        <Typography variant='body2' sx={{ fontStyle: 'italic', mt: 1 }} color='text.secondary'>
                            {t('components.dialogs.tag.tooltip')}
                        </Typography>
                    </form>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{t('common.actions.cancel')}</Button>
                <Button variant='contained' onClick={handleSubmit}>
                    {t('common.actions.submit')}
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
