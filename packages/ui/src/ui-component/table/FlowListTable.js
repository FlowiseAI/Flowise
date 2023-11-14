import PropTypes from 'prop-types'
import { useNavigate } from 'react-router-dom'
import { IconEdit } from '@tabler/icons'
import moment from 'moment'
import { styled } from '@mui/material/styles'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell, { tableCellClasses } from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
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

export const FlowListTable = ({ data, images, filterFunction }) => {
    const navigate = useNavigate()
    const goToCanvas = (selectedChatflow) => {
        navigate(`/canvas/${selectedChatflow.id}`)
    }
    let nodeCount = 0
    return (
        <>
            <TableContainer style={{ marginTop: '30', border: 1 }} component={Paper}>
                <Table sx={{ minWidth: 650 }} size='small' aria-label='a dense table'>
                    <TableHead>
                        <TableRow sx={{ marginTop: '10', backgroundColor: 'primary' }}>
                            <StyledTableCell
                                component='th'
                                scope='row'
                                sx={{ fontSize: '1.1rem', fontWeight: 200 }}
                                style={{ width: '25%' }}
                                key='0'
                            >
                                Name
                            </StyledTableCell>
                            <StyledTableCell style={{ width: '35%' }} key='1'>
                                Nodes (Showing first 5)
                            </StyledTableCell>
                            <StyledTableCell style={{ width: '30%' }} key='2'>
                                Last Modified Date
                            </StyledTableCell>
                            <StyledTableCell style={{ width: '10%' }} key='3'>
                                Actions
                            </StyledTableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data.filter(filterFunction).map((row, index) => (
                            <StyledTableRow key={index}>
                                <TableCell key='0'>
                                    <Typography
                                        sx={{ fontSize: '1.2rem', fontWeight: 500, overflowWrap: 'break-word', whiteSpace: 'pre-line' }}
                                    >
                                        {row.templateName || row.name}
                                    </Typography>
                                </TableCell>

                                <TableCell key='1'>
                                    {images[row.id] && (
                                        <div
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'row',
                                                flexWrap: 'wrap',
                                                marginTop: 5
                                            }}
                                        >
                                            {images[row.id].slice(0, images[row.id].length > 5 ? 5 : images[row.id].length).map((img) => (
                                                <div
                                                    key={img}
                                                    style={{
                                                        width: 35,
                                                        height: 35,
                                                        marginRight: 5,
                                                        borderRadius: '50%',
                                                        backgroundColor: 'white',
                                                        marginTop: 5
                                                    }}
                                                >
                                                    <img
                                                        style={{ width: '100%', height: '100%', padding: 5, objectFit: 'contain' }}
                                                        alt=''
                                                        src={img}
                                                    />
                                                </div>
                                            ))}
                                            {images[row.id].length > 5 && (
                                                <Typography
                                                    sx={{ alignItems: 'center', display: 'flex', fontSize: '.8rem', fontWeight: 200 }}
                                                >
                                                    + {images[row.id].length - 5} More
                                                </Typography>
                                            )}
                                        </div>
                                    )}
                                </TableCell>
                                <TableCell key='2'>{moment(row.updatedDate).format('dddd, MMMM Do, YYYY h:mm:ss A')}</TableCell>
                                <TableCell key='3'>
                                    <Button
                                        variant='outlined'
                                        sx={{ marginRight: '10px' }}
                                        onClick={() => goToCanvas(row)}
                                        startIcon={<IconEdit />}
                                    >
                                        Open
                                    </Button>
                                </TableCell>
                            </StyledTableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </>
    )
}

FlowListTable.propTypes = {
    data: PropTypes.object,
    images: PropTypes.array,
    filterFunction: PropTypes.func
}
