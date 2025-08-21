import { Box } from '@mui/material'
import { StyledButton } from './StyledButton'
import PropTypes from 'prop-types'

export const AtlassianAuthButton = ({ componentCredential, handleAtlassianOAuth, baseURL }) => {
    if (!componentCredential || componentCredential.name !== 'atlassianOAuth') return null

    return (
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
            <StyledButton
                variant='contained'
                onClick={handleAtlassianOAuth}
                startIcon={
                    <img
                        alt={componentCredential.name}
                        src={`${baseURL}/api/v1/components-credentials-icon/${componentCredential.name}`}
                        style={{ width: 20, height: 20 }}
                    />
                }
                sx={{
                    backgroundColor: '#0052CC',
                    color: 'white',
                    '&:hover': {
                        backgroundColor: '#0747A6'
                    },
                    '&:disabled': {
                        backgroundColor: 'lightgray',
                        color: 'gray'
                    }
                }}
            >
                Authorize with Atlassian
            </StyledButton>
        </Box>
    )
}

AtlassianAuthButton.propTypes = {
    componentCredential: PropTypes.object,
    credentialData: PropTypes.object,
    handleAtlassianOAuth: PropTypes.func,
    baseURL: PropTypes.string
}
