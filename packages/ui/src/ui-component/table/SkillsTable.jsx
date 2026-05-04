import PropTypes from 'prop-types'
import { useSelector } from 'react-redux'
import { styled } from '@mui/material/styles'
import { tableCellClasses } from '@mui/material/TableCell'
import {
    Box,
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
import { IconBook2, IconFileText, IconUpload } from '@tabler/icons-react'

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

export const SkillsTable = ({ data, isLoading, onSelect }) => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)

    return (
        <TableContainer sx={{ border: 1, borderColor: theme.palette.grey[900] + 25, borderRadius: 2 }} component={Paper}>
            <Table sx={{ minWidth: 650 }} size='small' aria-label='skills table'>
                <TableHead
                    sx={{
                        backgroundColor: customization.isDarkMode ? theme.palette.common.black : theme.palette.grey[100],
                        height: 56
                    }}
                >
                    <TableRow>
                        <StyledTableCell>Name</StyledTableCell>
                        <StyledTableCell>Description</StyledTableCell>
                        <StyledTableCell>Files</StyledTableCell>
                        <StyledTableCell>Status</StyledTableCell>
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
                                const fileCount = typeof row.fileCount === 'number' ? row.fileCount : 0
                                const hasPublished = !!row.publishedBundleId
                                const color = row.color || theme.palette.primary.main
                                return (
                                    <StyledTableRow key={row.id}>
                                        <StyledTableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                {row.iconSrc ? (
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
                                                ) : (
                                                    <div
                                                        style={{
                                                            width: 35,
                                                            height: 35,
                                                            flexShrink: 0,
                                                            borderRadius: '50%',
                                                            background: color,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}
                                                    >
                                                        <IconBook2 size={18} color='white' />
                                                    </div>
                                                )}
                                                <Typography sx={{ fontSize: 14, fontWeight: 500 }}>
                                                    <Button onClick={() => onSelect(row)} sx={{ textAlign: 'left' }}>
                                                        {row.name}
                                                    </Button>
                                                </Typography>
                                            </Box>
                                        </StyledTableCell>
                                        <StyledTableCell>
                                            <Typography
                                                sx={{
                                                    fontSize: 13,
                                                    color: 'text.secondary',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                    textOverflow: 'ellipsis',
                                                    overflow: 'hidden',
                                                    maxWidth: 480,
                                                    whiteSpace: 'pre-line',
                                                    overflowWrap: 'break-word'
                                                }}
                                            >
                                                {row.description || ''}
                                            </Typography>
                                        </StyledTableCell>
                                        <StyledTableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <IconFileText size={14} />
                                                <Typography sx={{ fontSize: 13 }}>
                                                    {fileCount} {fileCount === 1 ? 'file' : 'files'}
                                                </Typography>
                                            </Box>
                                        </StyledTableCell>
                                        <StyledTableCell>
                                            {hasPublished ? (
                                                <Chip
                                                    size='small'
                                                    icon={<IconUpload size={14} />}
                                                    label='Published'
                                                    color='success'
                                                    variant='outlined'
                                                />
                                            ) : (
                                                <Chip size='small' label='Draft' variant='outlined' />
                                            )}
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

SkillsTable.propTypes = {
    data: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.string.isRequired,
            name: PropTypes.string.isRequired,
            description: PropTypes.string,
            color: PropTypes.string,
            iconSrc: PropTypes.string,
            fileCount: PropTypes.number,
            publishedBundleId: PropTypes.string
        })
    ),
    isLoading: PropTypes.bool,
    onSelect: PropTypes.func
}
