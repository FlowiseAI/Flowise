import PropTypes from 'prop-types'
import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Button
} from '@mui/material'

const ShowcaseCreateDialog = ({ open, onClose, onSave }) => {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [url, setUrl] = useState('')

  const handleSave = () => {
    onSave({
      name: name?.trim(),
      category: category?.trim(),
      description: description?.trim(),
      url: url?.trim()
    })
  }

  const disabled = !name?.trim()

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Save New Agents</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} mt={0.5}>
          <TextField
            label="Title"
            placeholder="My New Chatflow"
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <TextField
            label="Add Category"
            placeholder="Add Category"
            fullWidth
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <TextField
            label="Add description"
            placeholder="Add description"
            fullWidth
            multiline
            minRows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          {/* NEW FIELD */}
          <TextField
            label="URL"
            placeholder="https://your-agent-url.com or http://localhost:3000/chatbot/<id>"
            fullWidth
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="text">Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={disabled}>Save</Button>
      </DialogActions>
    </Dialog>
  )
}

ShowcaseCreateDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired
}

export default ShowcaseCreateDialog
