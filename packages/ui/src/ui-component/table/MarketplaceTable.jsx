import PropTypes from 'prop-types'
import { styled } from '@mui/material/styles'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell, { tableCellClasses } from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import Chip from '@mui/material/Chip'
import { Button, Typography } from '@mui/material'

const StyledTableCell = styled(TableCell)(({ theme }) => ({
    [`&.${tableCellClasses.head}`]: {
        backgroundColor: theme.palette.common.black,
        color: theme.palette.common.white
    },
    [`&.${tableCellClasses.body}`]: {
        fontSize: 14
    }
}))

const StyledTableRow = styled(TableRow)(({ theme }) => ({
    '&:nth-of-type(odd)': {
        backgroundColor: theme.palette.action.hover
    },
    // hide last border
    '&:last-child td, &:last-child th': {
        border: 0
    }
}))

export const MarketplaceTable = ({ data, filterFunction, filterByBadge, filterByType, filterByFramework, goToCanvas, goToTool }) => {
    const openTemplate = (selectedTemplate) => {
        if (selectedTemplate.flowData) {
            goToCanvas(selectedTemplate)
        } else {
            goToTool(selectedTemplate)
        }
    }

    return (
        <>
            <TableContainer style={{ marginTop: '30', border: 1 }} component={Paper}>
                <Table sx={{ minWidth: 650 }} size='small' aria-label='a dense table'>
                    <TableHead>
                        <TableRow sx={{ marginTop: '10', backgroundColor: 'primary' }}>
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
                        {data
                            .filter(filterByBadge)
                            .filter(filterByType)
                            .filter(filterFunction)
                            .filter(filterByFramework)
                            .map((row, index) => (
                                <StyledTableRow key={index}>
                                    <TableCell key='0'>
                                        <Typography
                                            sx={{ fontSize: '1.2rem', fontWeight: 500, overflowWrap: 'break-word', whiteSpace: 'pre-line' }}
                                        >
                                            <Button onClick={() => openTemplate(row)} sx={{ textAlign: 'left' }}>
                                                {row.templateName || row.name}
                                            </Button>
                                        </Typography>
                                    </TableCell>
                                    <TableCell key='1'>
                                        <Typography>{row.type}</Typography>
                                    </TableCell>
                                    <TableCell key='2'>
                                        <Typography sx={{ overflowWrap: 'break-word', whiteSpace: 'pre-line' }}>
                                            {row.description || ''}
                                        </Typography>
                                    </TableCell>
                                    <TableCell key='3'>
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
                                    </TableCell>
                                    <TableCell key='4'>
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
                                    </TableCell>
                                </StyledTableRow>
                            ))}
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
    goToCanvas: PropTypes.func
}
