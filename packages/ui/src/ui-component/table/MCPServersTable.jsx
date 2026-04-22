import PropTypes from 'prop-types'
import { useSelector } from 'react-redux'
import { styled } from '@mui/material/styles'
import { tableCellClasses } from '@mui/material/TableCell'
import {
    Box,
    Button,
    Paper,
    Skeleton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
    useTheme
} from '@mui/material'
import { IconTool } from '@tabler/icons-react'
import { MCP_SERVER_STATUS } from '@/store/constant'

const StyledTableCell = styled(TableCell)(({ theme }) => ({
    borderColor: theme.palette.grey[900] + 25,
    [`&.${tableCellClasses.head}`]: {
        color: theme.palette.grey[900]
    },
    [`&.${tableCellClasses.body}`]: {
        fontSize: 14,
        height: 64
    }
}))

const StyledTableRow = styled(TableRow)(() => ({
    '&:last-child td, &:last-child th': {
        border: 0
    }
}))

const getStatusColors = (status, isDarkMode, theme) => {
    switch (status) {
        case MCP_SERVER_STATUS.AUTHORIZED:
            return isDarkMode ? ['#1b5e20', '#2e7d32', '#ffffff'] : ['#e8f5e9', '#81c784', '#43a047']
        case MCP_SERVER_STATUS.ERROR:
            return isDarkMode ? ['#b71c1c', '#c62828', '#ffffff'] : ['#ffebee', '#ef9a9a', '#c62828']
        case MCP_SERVER_STATUS.PENDING:
        default:
            return isDarkMode
                ? [theme.palette.grey[800], theme.palette.grey[500], theme.palette.grey[200]]
                : [theme.palette.grey[100], theme.palette.grey[400], theme.palette.grey[700]]
    }
}

export const StatusBadge = ({ status }) => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    const colors = getStatusColors(status, customization.isDarkMode, theme)
    return (
        <div
            style={{
                display: 'inline-flex',
                flexDirection: 'row',
                alignItems: 'center',
                background: colors[0],
                borderRadius: '25px',
                paddingTop: '3px',
                paddingBottom: '3px',
                paddingLeft: '10px',
                paddingRight: '10px',
                width: 'fit-content'
            }}
        >
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: colors[1], marginRight: 5 }} />
            <span style={{ fontSize: '0.65rem', color: colors[2], textTransform: 'uppercase' }}>{status}</span>
        </div>
    )
}

StatusBadge.propTypes = {
    status: PropTypes.string
}

export const MCPServersTable = ({ data, isLoading, onSelect }) => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)

    return (
        <TableContainer sx={{ border: 1, borderColor: theme.palette.grey[900] + 25, borderRadius: 2 }} component={Paper}>
            <Table sx={{ minWidth: 650 }} size='small' aria-label='MCP servers table'>
                <TableHead
                    sx={{
                        backgroundColor: customization.isDarkMode ? theme.palette.common.black : theme.palette.grey[100],
                        height: 56
                    }}
                >
                    <TableRow>
                        <StyledTableCell>Name</StyledTableCell>
                        <StyledTableCell>Server URL</StyledTableCell>
                        <StyledTableCell>Status</StyledTableCell>
                        <StyledTableCell>Tools</StyledTableCell>
                        <StyledTableCell>&nbsp;</StyledTableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {isLoading ? (
                        <>
                            {[0, 1].map((i) => (
                                <StyledTableRow key={i}>
                                    {[0, 1, 2, 3, 4].map((j) => (
                                        <StyledTableCell key={j}>
                                            <Skeleton variant='text' />
                                        </StyledTableCell>
                                    ))}
                                </StyledTableRow>
                            ))}
                        </>
                    ) : (
                        <>
                            {data?.map((row) => {
                                const toolCount = typeof row.toolCount === 'number' ? row.toolCount : 0
                                return (
                                    <StyledTableRow key={row.id}>
                                        <StyledTableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                {row.iconSrc && (
                                                    <div
                                                        style={{
                                                            width: 35,
                                                            height: 35,
                                                            flexShrink: 0,
                                                            borderRadius: '50%',
                                                            backgroundImage: `url(${row.iconSrc})`,
                                                            backgroundSize: 'contain',
                                                            backgroundRepeat: 'no-repeat',
                                                            backgroundPosition: 'center center'
                                                        }}
                                                    />
                                                )}
                                                {!row.iconSrc && row.color && (
                                                    <div
                                                        style={{
                                                            width: 35,
                                                            height: 35,
                                                            flexShrink: 0,
                                                            borderRadius: '50%',
                                                            background: row.color
                                                        }}
                                                    />
                                                )}
                                                <Typography sx={{ fontSize: 14, fontWeight: 500 }}>
                                                    <Button onClick={() => onSelect(row)} sx={{ textAlign: 'left' }}>
                                                        {row.name}
                                                    </Button>
                                                </Typography>
                                            </Box>
                                        </StyledTableCell>
                                        <StyledTableCell>
                                            <Tooltip title={row.serverUrl} placement='top'>
                                                <Typography
                                                    sx={{
                                                        fontSize: 13,
                                                        color: 'text.secondary',
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: 1,
                                                        WebkitBoxOrient: 'vertical',
                                                        textOverflow: 'ellipsis',
                                                        overflow: 'hidden',
                                                        maxWidth: 300
                                                    }}
                                                >
                                                    {row.serverUrl}
                                                </Typography>
                                            </Tooltip>
                                        </StyledTableCell>
                                        <StyledTableCell>{row.status && <StatusBadge status={row.status} />}</StyledTableCell>
                                        <StyledTableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <IconTool size={14} />
                                                <Typography sx={{ fontSize: 13 }}>
                                                    {toolCount} {toolCount === 1 ? 'tool' : 'tools'}
                                                </Typography>
                                            </Box>
                                        </StyledTableCell>
                                        <StyledTableCell />
                                    </StyledTableRow>
                                )
                            })}
                        </>
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    )
}

MCPServersTable.propTypes = {
    data: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.string.isRequired,
            name: PropTypes.string.isRequired,
            serverUrl: PropTypes.string.isRequired,
            status: PropTypes.string,
            tools: PropTypes.string, // JSON stringified array (legacy; no longer shipped on list responses)
            toolCount: PropTypes.number,
            iconSrc: PropTypes.string,
            color: PropTypes.string
        })
    ),
    isLoading: PropTypes.bool,
    onSelect: PropTypes.func
}
