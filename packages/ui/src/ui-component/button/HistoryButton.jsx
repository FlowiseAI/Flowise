import { useState } from 'react'
import PropTypes from 'prop-types'
import { IconButton, Tooltip } from '@mui/material'
import { IconHistory } from '@tabler/icons-react'

// project imports
import HistoryDialog from '@/ui-component/dialog/HistoryDialog'

const HistoryButton = ({ entityType, entityId, entityName, onRestore, disabled = false, size = 'medium', color = 'default' }) => {
    const [showHistory, setShowHistory] = useState(false)

    const handleOpenHistory = () => {
        if (!disabled && entityId) {
            setShowHistory(true)
        }
    }

    const handleCloseHistory = () => {
        setShowHistory(false)
    }

    const handleRestore = (historyItem) => {
        onRestore?.(historyItem)
        // Optionally reload the current flow/assistant data here
    }

    return (
        <>
            <Tooltip title={disabled ? 'Save the flow first to view history' : 'View version history'}>
                <span>
                    <IconButton size={size} color={color} onClick={handleOpenHistory} disabled={disabled}>
                        <IconHistory />
                    </IconButton>
                </span>
            </Tooltip>

            <HistoryDialog
                show={showHistory}
                dialogProps={{
                    entityType,
                    entityId,
                    entityName
                }}
                onCancel={handleCloseHistory}
                onRestore={handleRestore}
            />
        </>
    )
}

HistoryButton.propTypes = {
    entityType: PropTypes.string.isRequired,
    entityId: PropTypes.string.isRequired,
    entityName: PropTypes.string.isRequired,
    onRestore: PropTypes.func,
    disabled: PropTypes.bool,
    size: PropTypes.string,
    color: PropTypes.string
}

export default HistoryButton
