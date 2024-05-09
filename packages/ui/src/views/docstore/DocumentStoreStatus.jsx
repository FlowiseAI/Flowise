import { useTheme } from '@mui/material'
import { useSelector } from 'react-redux'
import PropTypes from 'prop-types'

const DocumentStoreStatus = ({ status, isTableView }) => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)

    const getColor = (status) => {
        switch (status) {
            case 'STALE':
                return customization.isDarkMode
                    ? [theme.palette.grey[400], theme.palette.grey[600], theme.palette.grey[700]]
                    : [theme.palette.grey[300], theme.palette.grey[500], theme.palette.grey[700]]
            case 'EMPTY':
                return ['#673ab7', '#673ab7', '#673ab7']
            case 'SYNCING':
                return ['#fff8e1', '#ffe57f', '#ffc107']
            case 'SYNC':
                return ['#cdf5d8', '#00e676', '#00c853']
            case 'NEW':
                return ['#e3f2fd', '#2196f3', '#1e88e5']
            default:
                return customization.isDarkMode
                    ? [theme.palette.grey[300], theme.palette.grey[500], theme.palette.grey[700]]
                    : [theme.palette.grey[300], theme.palette.grey[500], theme.palette.grey[700]]
        }
    }

    return (
        <>
            {!isTableView && (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignContent: 'center',
                        alignItems: 'center',
                        background: status === 'EMPTY' ? 'transparent' : getColor(status)[0],
                        border: status === 'EMPTY' ? '1px solid' : 'none',
                        borderColor: status === 'EMPTY' ? getColor(status)[0] : 'transparent',
                        borderRadius: '25px',
                        paddingTop: '3px',
                        paddingBottom: '3px',
                        paddingLeft: '10px',
                        paddingRight: '10px'
                    }}
                >
                    <div
                        style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            backgroundColor: status === 'EMPTY' ? 'transparent' : getColor(status)[1],
                            border: status === 'EMPTY' ? '3px solid' : 'none',
                            borderColor: status === 'EMPTY' ? getColor(status)[1] : 'transparent'
                        }}
                    />
                    <span style={{ fontSize: '0.7rem', color: getColor(status)[2], marginLeft: 5 }}>{status}</span>
                </div>
            )}
            {isTableView && (
                <div
                    style={{
                        display: 'flex',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: status === 'EMPTY' ? 'transparent' : getColor(status)[1],
                        border: status === 'EMPTY' ? '3px solid' : 'none',
                        borderColor: status === 'EMPTY' ? getColor(status)[1] : 'transparent'
                    }}
                    title={status}
                ></div>
            )}
        </>
    )
}

DocumentStoreStatus.propTypes = {
    status: PropTypes.string,
    isTableView: PropTypes.bool
}

export default DocumentStoreStatus
