import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { useSelector } from 'react-redux'
import moment from 'moment'
import { styled } from '@mui/material/styles'
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    Paper,
    Skeleton,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TableSortLabel,
    Tooltip,
    Typography,
    useTheme
} from '@mui/material'
import { tableCellClasses } from '@mui/material/TableCell'
import FlowListMenu from '../button/FlowListMenu'
import { Link } from 'react-router-dom'
import { 
    OpenInNew,
    StopCircleOutlined
} from '@mui/icons-material'

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
    // hide last border
    '&:last-child td, &:last-child th': {
        border: 0
    }
}))

const getLocalStorageKeyName = (name, isAgentCanvas) => {
    return (isAgentCanvas ? 'agentcanvas' : 'chatflowcanvas') + '_' + name
}

export const FlowListTable = ({ data, images, isLoading, filterFunction, updateFlowsApi, setError, isAgentCanvas }) => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)

    const localStorageKeyOrder = getLocalStorageKeyName('order', isAgentCanvas)
    const localStorageKeyOrderBy = getLocalStorageKeyName('orderBy', isAgentCanvas)

    const [order, setOrder] = useState(localStorage.getItem(localStorageKeyOrder) || 'desc')
    const [orderBy, setOrderBy] = useState(localStorage.getItem(localStorageKeyOrderBy) || 'updatedDate')

    const handleRequestSort = (property) => {
        const isAsc = orderBy === property && order === 'asc'
        const newOrder = isAsc ? 'desc' : 'asc'
        setOrder(newOrder)
        setOrderBy(property)
        localStorage.setItem(localStorageKeyOrder, newOrder)
        localStorage.setItem(localStorageKeyOrderBy, property)
    }

    const [sortedData, setSortedData] = useState([]);

    const handleSortData = () => {
        if (!data) return [];
        const sorted = [...data].map((row) => ({
            ...row,
            sandboxStatus: row.sandboxStatus || 'Not Running' // Ensure initial status
        })).sort((a, b) => {
            if (orderBy === 'name') {
                return order === 'asc' ? (a.name || '').localeCompare(b.name || '') : (b.name || '').localeCompare(a.name || '');
            } else if (orderBy === 'updatedDate') {
                return order === 'asc'
                    ? new Date(a.updatedDate) - new Date(b.updatedDate)
                    : new Date(b.updatedDate) - new Date(a.updatedDate);
            }
            return 0;
        });
        return sorted;
    };

    const updateSandboxStatus = (id, newStatus) => {
        setSortedData((prevData) =>
            prevData.map((row) =>
                row.id === id ? { ...row, sandboxStatus: newStatus } : row
            )
        );
    };

    useEffect(() => {
        setSortedData(handleSortData());
    }, [data, order, orderBy]); // Run effect when any dependency changes

    // const handleRequestSort = (property) => {
    //     const isAsc = orderBy === property && order === 'asc';
    //     setOrder(isAsc ? 'desc' : 'asc');
    //     setOrderBy(property);
    // };

    // const sortedData = data
    //     ? [...data].sort((a, b) => {
    //           if (orderBy === 'name') {
    //               return order === 'asc' ? (a.name || '').localeCompare(b.name || '') : (b.name || '').localeCompare(a.name || '')
    //           } else if (orderBy === 'updatedDate') {
    //               return order === 'asc'
    //                   ? new Date(a.updatedDate) - new Date(b.updatedDate)
    //                   : new Date(b.updatedDate) - new Date(a.updatedDate)
    //           }
    //           return 0
    //       })
    //     : []

    const handleOpenSandbox = (id) => {
        console.log('Button clicked for', id);
        window.open(`http://44.211.59.18:3008/`, '_blank');
    }
    return (
        <>
            <TableContainer sx={{ border: 1, borderColor: theme.palette.grey[900] + 25, borderRadius: 2 }} component={Paper}>
                <Table sx={{ minWidth: 650 }} size='small' aria-label='a dense table'>
                    <TableHead
                        sx={{
                            backgroundColor: customization.isDarkMode ? theme.palette.common.black : theme.palette.grey[100],
                            height: 56
                        }}
                    >
                        <TableRow>
                            <StyledTableCell component='th' scope='row' style={{ width: '25%' }} key='0'>
                                <TableSortLabel active={orderBy === 'name'} direction={order} onClick={() => handleRequestSort('name')}>
                                    Name
                                </TableSortLabel>
                            </StyledTableCell>
                            <StyledTableCell style={{ width: '25%' }} key='1'>
                                <TableSortLabel
                                    active={orderBy === 'updatedDate'}
                                    direction={order}
                                    onClick={() => handleRequestSort('updatedDate')}
                                >
                                    Last Modified Date
                                </TableSortLabel>
                            </StyledTableCell>
                            <StyledTableCell style={{ width: '20%' }} key='2'>
                                Sandbox 
                            </StyledTableCell>
                            <StyledTableCell style={{ width: '25%' }} key='3'>
                                <Stack
                                    direction={{ xs: 'column', sm: 'row' }}
                                    spacing={1}
                                    justifyContent='center'
                                >
                                    Actions
                                </Stack>
                            </StyledTableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {isLoading ? (
                            <>
                                <StyledTableRow>
                                    <StyledTableCell>
                                        <Skeleton variant='text' />
                                    </StyledTableCell>
                                    <StyledTableCell>
                                        <Skeleton variant='text' />
                                    </StyledTableCell>
                                    <StyledTableCell>
                                        <Skeleton variant='text' />
                                    </StyledTableCell>
                                    <StyledTableCell>
                                        <Skeleton variant='text' />
                                    </StyledTableCell>
                                </StyledTableRow>
                                <StyledTableRow>
                                    <StyledTableCell>
                                        <Skeleton variant='text' />
                                    </StyledTableCell>
                                    <StyledTableCell>
                                        <Skeleton variant='text' />
                                    </StyledTableCell>
                                    <StyledTableCell>
                                        <Skeleton variant='text' />
                                    </StyledTableCell>
                                    <StyledTableCell>
                                        <Skeleton variant='text' />
                                    </StyledTableCell>
                                </StyledTableRow>
                            </>
                        ) : (
                            <>
                                {sortedData.filter(filterFunction).map((row, index) => (
                                    <StyledTableRow key={index}>
                                        <StyledTableCell key='0'>
                                            <Tooltip title={row.templateName || row.name}>
                                                <Typography
                                                    sx={{
                                                        display: '-webkit-box',
                                                        fontSize: 14,
                                                        fontWeight: 500,
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: 'vertical',
                                                        textOverflow: 'ellipsis',
                                                        overflow: 'hidden'
                                                    }}
                                                >
                                                    <Link
                                                        to={`/${isAgentCanvas ? 'agentcanvas' : 'canvas'}/${row.id}`}
                                                        style={{ color: '#2196f3', textDecoration: 'none' }}
                                                    >
                                                        {row.templateName || row.name}
                                                    </Link>
                                                </Typography>
                                            </Tooltip>
                                        </StyledTableCell>
                                        <StyledTableCell key='1'>{moment(row.updatedDate).format('MMMM Do, YYYY')}</StyledTableCell>
                                        <StyledTableCell key='2'>
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                <Typography variant="body2">{row.sandboxStatus}</Typography>
                                                <Tooltip title={row.sandboxStatus === 'Ready'? "Click to open Chat UI":"Sandbox is not running" }>
                                                    <Button
                                                        // variant="outlined"
                                                        // style={{ width: '20px' }}
                                                        color={row.sandboxStatus === 'Not Running' ? 'inherit' : 'primary'}
                                                        startIcon={<OpenInNew />}
                                                        onClick={() => {
                                                            // console.log('Button clicked for', row.name || row.id);
                                                            handleOpenSandbox(row.name || row.id);
                                                        }}
                                                        disabled={row.sandboxStatus !== 'Ready'}
                                                    >
                                                    </Button>
                                                </Tooltip>
                                                {row.sandboxStatus === "Getting Ready" ? (
                                                    <CircularProgress size={20} />
                                                ) : null}
                                                {row.sandboxStatus === "Ready" ? (
                                                    <Button
                                                        // style={{ width: '10px' }}
                                                        // variant="outlined"
                                                        color={row.sandboxStatus === 'Not Running' ? 'inherit' : 'primary'}
                                                        startIcon={<StopCircleOutlined />}
                                                        onClick={() => {
                                                            console.log('Stop Button clicked for', row.name || row.id);
                                                            // handleStopSandbox(row.name || row.id);
                                                        }}
                                                        disabled={row.sandboxStatus !== 'Ready'}
                                                        >
                                                    </Button>
                                                ) : null}
                                            </Stack>
                                        </StyledTableCell>
                                        <StyledTableCell key='3'>
                                            <Stack
                                                direction={{ xs: 'column', sm: 'row' }}
                                                spacing={1}
                                                justifyContent='center'
                                                alignItems='center'
                                            >
                                                <FlowListMenu
                                                    isAgentCanvas={isAgentCanvas}
                                                    chatflow={row}
                                                    setError={setError}
                                                    updateFlowsApi={updateFlowsApi}
                                                    sandboxStatus={row.sandboxStatus}
                                                    updateSandboxStatus={updateSandboxStatus}
                                                />
                                            </Stack>
                                        </StyledTableCell>
                                    </StyledTableRow>
                                ))}
                            </>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </>
    )
}

FlowListTable.propTypes = {
    data: PropTypes.array,
    images: PropTypes.object,
    isLoading: PropTypes.bool,
    filterFunction: PropTypes.func,
    updateFlowsApi: PropTypes.object,
    setError: PropTypes.func,
    isAgentCanvas: PropTypes.bool
}
