import { useEffect, useMemo, useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Stack
} from '@mui/material'

export default function ShowcaseRenameDialog({ open, row, onClose, onSave }) {
  const initial = useMemo(() => {
    let shareUrl = ''
    try {
      const fd = JSON.parse(row?.flowData || '{}')
      shareUrl = fd?.metadata?.shareUrl || ''
    } catch {}
    return {
      name: row?.name || '',
      description: row?.description || '',
      url: shareUrl
    }
  }, [row])

  const [name, setName] = useState(initial.name)
  const [description, setDescription] = useState(initial.description)
  const [url, setUrl] = useState(initial.url)

  useEffect(() => {
    setName(initial.name)
    setDescription(initial.description)
    setUrl(initial.url)
  }, [initial, open])

  const handleSave = () => onSave({ name, description, url })

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Rename Agent</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Agent name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            autoFocus
          />
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
          <TextField
            label="Agent URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            fullWidth
            placeholder="https://…"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="text">Cancel</Button>
        <Button onClick={handleSave} variant="contained">Rename</Button>
      </DialogActions>
    </Dialog>
  )
}
