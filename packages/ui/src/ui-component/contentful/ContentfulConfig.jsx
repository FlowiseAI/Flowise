import { useState } from 'react'
import PropTypes from 'prop-types'
import { Box, Button, Typography, Chip } from '@mui/material'
import ContentfulConfigDialog from '../dialog/ContentfulConfigDialog'

export const ContentfulConfig = ({ value, onChange, disabled = false, nodeData }) => {
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [config, setConfig] = useState(value ? JSON.parse(value) : {})

    const handleOpenDialog = () => {
        setIsDialogOpen(true)
    }

    const handleCloseDialog = () => {
        setIsDialogOpen(false)
    }

    const handleSaveConfig = (newConfig) => {
        const parsedConfig = JSON.parse(newConfig)
        setConfig(parsedConfig)
        onChange(newConfig)
        setIsDialogOpen(false)
    }

    return (
        <Box sx={{ padding: 2 }}>
            {config.contentType && (
                <Box sx={{ marginBottom: 2 }}>
                    <Typography variant='subtitle1' gutterBottom>
                        Selected Content Type: <Chip label={config.contentType} color='primary' />
                    </Typography>
                    <Typography variant='subtitle1' gutterBottom>
                        Selected Fields:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {config.fieldsToParse.map((field, index) => (
                            <Chip key={index} label={field.replace('fields.', '')} variant='outlined' />
                        ))}
                    </Box>
                </Box>
            )}
            <Button variant='contained' onClick={handleOpenDialog} disabled={disabled}>
                {value ? 'Edit Config' : 'Config'}
            </Button>
            <ContentfulConfigDialog
                open={isDialogOpen}
                onClose={handleCloseDialog}
                onSave={handleSaveConfig}
                initialValue={JSON.stringify(config)}
                nodeData={nodeData}
            />
        </Box>
    )
}

ContentfulConfig.propTypes = {
    value: PropTypes.string,
    onChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
    nodeData: PropTypes.object.isRequired
}

export default ContentfulConfig
