import PropTypes from 'prop-types'
import { useNavigate } from 'react-router-dom'
import moment from 'moment'
import { styled } from '@mui/material/styles'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell, { tableCellClasses } from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import Chip from '@mui/material/Chip'
import { Button, Stack, Typography } from '@mui/material'
import FlowListMenu from '../button/FlowListMenu'

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

export const FlowListTable = ({ data, images, filterFunction, updateFlowsApi }) => {
    const navigate = useNavigate()
    const goToCanvas = (selectedChatflow) => {
        navigate(`/canvas/${selectedChatflow.id}`)
    }

    return (
        <>
            <TableContainer style={{ marginTop: '30', border: 1 }} component={Paper}>
                <Table sx={{ minWidth: 650 }} size='small' aria-label='a dense table'>
                    <TableHead>
                        <TableRow sx={{ marginTop: '10', backgroundColor: 'primary' }}>
                            <StyledTableCell component='th' scope='row' style={{ width: '20%' }} key='0'>
                                Name
                            </StyledTableCell>
                            <StyledTableCell style={{ width: '25%' }} key='1'>
                                Category
                            </StyledTableCell>
                            <StyledTableCell style={{ width: '30%' }} key='2'>
                                Nodes
                            </StyledTableCell>
                            <StyledTableCell style={{ width: '15%' }} key='3'>
                                Last Modified Date
                            </StyledTableCell>
                            <StyledTableCell style={{ width: '10%' }} key='4'>
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
                                        <Button onClick={() => goToCanvas(row)}>{row.templateName || row.name}</Button>
                                    </Typography>
                                </TableCell>
                                <TableCell key='1'>
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'row',
                                            flexWrap: 'wrap',
                                            marginTop: 5
                                        }}
                                    >
                                        &nbsp;
                                        {row.category &&
                                            row.category
                                                .split(';')
                                                .map((tag, index) => (
                                                    <Chip key={index} label={tag} style={{ marginRight: 5, marginBottom: 5 }} />
                                                ))}
                                    </div>
                                </TableCell>
                                <TableCell key='2'>
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
                                <TableCell key='3'>{moment(row.updatedDate).format('MMMM Do, YYYY')}</TableCell>
                                <TableCell key='4'>
                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent='center' alignItems='center'>
                                        <FlowListMenu chatflow={row} updateFlowsApi={updateFlowsApi} />
                                    </Stack>
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
    filterFunction: PropTypes.func,
    updateFlowsApi: PropTypes.object
}
