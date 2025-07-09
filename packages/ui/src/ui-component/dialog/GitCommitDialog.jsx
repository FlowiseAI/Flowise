import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'
import { Dialog, DialogTitle, DialogContent, DialogActions, OutlinedInput, Button } from '@mui/material'
import { StyledButton } from '@/ui-component/button/StyledButton'

const GitCommitDialog = ({ show, message, onMessageChange, onCancel, onCommit, loading }) => {
    const portalElement = document.getElementById('portal')

    const component = show ? (
        <Dialog
            fullWidth
            maxWidth='sm'
            open={show}
            onClose={onCancel}
            aria-labelledby='publish-dialog-title'
            aria-describedby='publish-dialog-description'
        >
            <DialogTitle id='publish-dialog-title'>
                Commit Message
            </DialogTitle>
            <DialogContent>
                <OutlinedInput
                    size='small'
                    sx={{ mt: 1 }}
                    type='text'
                    fullWidth
                    placeholder='Enter commit message'
                    value={message}
                    onChange={onMessageChange}
                    autoFocus
                    multiline
                    rows={4}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel} disabled={loading}>Cancel</Button>
                <StyledButton
                    disabled={!message || loading}
                    variant='contained'
                    onClick={onCommit}
                >
                    {loading ? 'Committing...' : 'Commit'}
                </StyledButton>
            </DialogActions>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

GitCommitDialog.propTypes = {
    show: PropTypes.bool.isRequired,
    message: PropTypes.string.isRequired,
    onMessageChange: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
    onCommit: PropTypes.func.isRequired,
    loading: PropTypes.bool
}

export default GitCommitDialog 