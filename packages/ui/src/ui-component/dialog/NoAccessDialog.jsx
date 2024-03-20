import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'

import { Dialog, DialogActions, DialogContent, Typography, DialogTitle } from '@mui/material'
import { StyledButton } from '@/ui-component/button/StyledButton'

const NoAccessDialog = ({ show }) => {
    const portalElement = document.getElementById('portal')

    const component = show ? (
        <Dialog open={show} fullWidth maxWidth='xs' aria-labelledby='alert-dialog-title' aria-describedby='alert-dialog-description'>
            <DialogTitle sx={{ fontSize: '1rem' }} id='alert-dialog-title'>
                <Typography>Not authorized</Typography>
            </DialogTitle>
            <DialogContent>
                <Typography>Logi AI is not available until you login as an authorized user.</Typography>
                <div style={{ marginTop: 20 }}></div>
                <DialogActions>
                    <StyledButton variant='contained' onClick={() => (window.location.href = '/?returnurl=/aichatbot')}>
                        Login
                    </StyledButton>
                </DialogActions>
            </DialogContent>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

NoAccessDialog.propTypes = {
    show: PropTypes.bool
}

export default NoAccessDialog
