import { Box } from '@mui/material'
import { StyledButton } from './StyledButton'
import PropTypes from 'prop-types'

export const GoogleAuthButton = ({ componentCredential, name, handleGoogleOAuth, baseURL }) => {
    if (!componentCredential || componentCredential.name !== 'googleOAuth') return null

    return (
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
            <StyledButton
                variant='contained'
                onClick={handleGoogleOAuth}
                disabled={!name}
                startIcon={
                    <img
                        alt={componentCredential.name}
                        src={`${baseURL}/api/v1/components-credentials-icon/${componentCredential.name}`}
                        style={{ width: 20, height: 20 }}
                    />
                }
                sx={{
                    backgroundColor: 'white',
                    color: 'black',
                    '&:hover': {
                        backgroundColor: 'lightgray'
                    },
                    '&:disabled': {
                        backgroundColor: 'lightgray',
                        color: 'gray'
                    }
                }}
            >
                Authorize with Google
            </StyledButton>
        </Box>
    )
}

GoogleAuthButton.propTypes = {
    componentCredential: PropTypes.object,
    name: PropTypes.string,
    handleGoogleOAuth: PropTypes.func,
    baseURL: PropTypes.string
}
