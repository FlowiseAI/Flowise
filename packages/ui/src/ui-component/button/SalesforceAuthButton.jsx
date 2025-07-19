import { Box } from '@mui/material'
import { StyledButton } from './StyledButton'
import PropTypes from 'prop-types'

export const SalesforceAuthButton = ({ componentCredential, handleSalesforceOAuth, baseURL }) => {
    if (!componentCredential || componentCredential.name !== 'salesforceOAuth') return null

    return (
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
            <StyledButton
                variant='contained'
                onClick={handleSalesforceOAuth}
                startIcon={
                    <img
                        alt={componentCredential.name}
                        src={`${baseURL}/api/v1/components-credentials-icon/${componentCredential.name}`}
                        style={{ width: 20, height: 20 }}
                    />
                }
                sx={{
                    backgroundColor: '#00A1E0',
                    color: 'white',
                    '&:hover': {
                        backgroundColor: '#0074A3'
                    },
                    '&:disabled': {
                        backgroundColor: 'lightgray',
                        color: 'gray'
                    }
                }}
            >
                Authorize with Salesforce
            </StyledButton>
        </Box>
    )
}

SalesforceAuthButton.propTypes = {
    componentCredential: PropTypes.object,
    credentialData: PropTypes.object,
    handleSalesforceOAuth: PropTypes.func,
    baseURL: PropTypes.string
}
