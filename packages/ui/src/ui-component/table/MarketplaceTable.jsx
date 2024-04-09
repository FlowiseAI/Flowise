import PropTypes from 'prop-types'
import { useSelector } from 'react-redux'
import { styled } from '@mui/material/styles'
import { tableCellClasses } from '@mui/material/TableCell'
import {
    Button,
    Chip,
    Paper,
    Skeleton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    useTheme
} from '@mui/material'

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

export const MarketplaceTable = ({
    data,
    filterFunction,
    filterByBadge,
    filterByType,
    filterByFramework,
    goToCanvas,
    goToTool,
    isLoading
}) => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)

    const openTemplate = (selectedTemplate) => {
        if (selectedTemplate.flowData) {
            goToCanvas(selectedTemplate)
        } else {
            goToTool(selectedTemplate)
        }
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
                            <StyledTableCell component='th' scope='row' style={{ width: '15%' }} key='0'>
                                Name
                            </StyledTableCell>
                            <StyledTableCell component='th' scope='row' style={{ width: '5%' }} key='1'>
                                Type
                            </StyledTableCell>
                            <StyledTableCell style={{ width: '35%' }} key='2'>
                                Description
                            </StyledTableCell>
                            <StyledTableCell style={{ width: '35%' }} key='3'>
                                Nodes
                            </StyledTableCell>
                            <StyledTableCell component='th' scope='row' style={{ width: '5%' }} key='4'>
                                &nbsp;
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
                                    <StyledTableCell>
                                        <Skeleton variant='text' />
                                    </StyledTableCell>
                                </StyledTableRow>
                            </>
                        ) : (
                            <>
                                {data
                                    ?.filter(filterByBadge)
                                    .filter(filterByType)
                                    .filter(filterFunction)
                                    .filter(filterByFramework)
                                    .map((row, index) => (
                                        <StyledTableRow key={index}>
                                            <StyledTableCell key='0'>
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
                                                    <Button onClick={() => openTemplate(row)} sx={{ textAlign: 'left' }}>
                                                        {row.templateName || row.name}
                                                    </Button>
                                                </Typography>
                                            </StyledTableCell>
                                            <StyledTableCell key='1'>
                                                <Typography>{row.type}</Typography>
                                            </StyledTableCell>
                                            <StyledTableCell key='2'>
                                                <Typography sx={{ overflowWrap: 'break-word', whiteSpace: 'pre-line' }}>
                                                    {row.description || ''}
                                                </Typography>
                                            </StyledTableCell>
                                            <StyledTableCell key='3'>
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        flexDirection: 'row',
                                                        flexWrap: 'wrap',
                                                        marginTop: 5
                                                    }}
                                                >
                                                    {row.categories &&
                                                        row.categories
                                                            .split(',')
                                                            .map((tag, index) => (
                                                                <Chip
                                                                    variant='outlined'
                                                                    key={index}
                                                                    size='small'
                                                                    label={tag.toUpperCase()}
                                                                    style={{ marginRight: 3, marginBottom: 3 }}
                                                                />
                                                            ))}
                                                </div>
                                            </StyledTableCell>
                                            <StyledTableCell key='4'>
                                                <Typography>
                                                    {row.badge &&
                                                        row.badge
                                                            .split(';')
                                                            .map((tag, index) => (
                                                                <Chip
                                                                    color={tag === 'POPULAR' ? 'primary' : 'error'}
                                                                    key={index}
                                                                    size='small'
                                                                    label={tag.toUpperCase()}
                                                                    style={{ marginRight: 5, marginBottom: 5 }}
                                                                />
                                                            ))}
                                                </Typography>
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

MarketplaceTable.propTypes = {
    data: PropTypes.array,
    filterFunction: PropTypes.func,
    filterByBadge: PropTypes.func,
    filterByType: PropTypes.func,
    filterByFramework: PropTypes.func,
    goToTool: PropTypes.func,
    goToCanvas: PropTypes.func,
    isLoading: PropTypes.bool
}
