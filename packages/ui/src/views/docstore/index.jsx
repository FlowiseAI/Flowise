import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'

// material-ui
import {
    Box,
    Paper,
    Skeleton,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    ToggleButton,
    ToggleButtonGroup,
    Typography
} from '@mui/material'
import { useTheme } from '@mui/material/styles'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import DocumentStoreCard from '@/ui-component/cards/DocumentStoreCard'
import { StyledButton } from '@/ui-component/button/StyledButton'
import AddDocStoreDialog from '@/views/docstore/AddDocStoreDialog'
import ErrorBoundary from '@/ErrorBoundary'
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import DocumentStoreStatus from '@/views/docstore/DocumentStoreStatus'

// API
import useApi from '@/hooks/useApi'
import documentsApi from '@/api/documentstore'

// icons
import { IconPlus, IconLayoutGrid, IconList } from '@tabler/icons'
import doc_store_empty from '@/assets/images/doc_store_empty.svg'

// const
import { baseURL, gridSpacing } from '@/store/constant'

// ==============================|| DOCUMENTS ||============================== //

const Documents = () => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)

    const navigate = useNavigate()
    const getAllDocumentStores = useApi(documentsApi.getAllDocumentStores)

    const [error, setError] = useState(null)
    const [isLoading, setLoading] = useState(true)
    const [images, setImages] = useState({})
    const [search, setSearch] = useState('')
    const [showDialog, setShowDialog] = useState(false)
    const [dialogProps, setDialogProps] = useState({})
    const [docStores, setDocStores] = useState([])
    const [view, setView] = useState(localStorage.getItem('docStoreDisplayStyle') || 'card')

    const handleChange = (event, nextView) => {
        if (nextView === null) return
        localStorage.setItem('docStoreDisplayStyle', nextView)
        setView(nextView)
    }

    function filterDocStores(data) {
        return data.name.toLowerCase().indexOf(search.toLowerCase()) > -1
    }

    const onSearchChange = (event) => {
        setSearch(event.target.value)
    }

    const goToDocumentStore = (id) => {
        navigate('/document-stores/' + id)
    }

    const addNew = () => {
        const dialogProp = {
            title: 'Add New Document Store',
            type: 'ADD',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Add'
        }
        setDialogProps(dialogProp)
        setShowDialog(true)
    }

    const onConfirm = () => {
        setShowDialog(false)
        getAllDocumentStores.request()
    }

    useEffect(() => {
        getAllDocumentStores.request()

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (getAllDocumentStores.data) {
            try {
                const docStores = getAllDocumentStores.data
                if (!Array.isArray(docStores)) return
                const loaderImages = {}

                for (let i = 0; i < docStores.length; i += 1) {
                    const loaders = docStores[i].loaders ?? []

                    let totalChunks = 0
                    let totalChars = 0
                    loaderImages[docStores[i].id] = []
                    for (let j = 0; j < loaders.length; j += 1) {
                        const imageSrc = `${baseURL}/api/v1/node-icon/${loaders[j].loaderId}`
                        if (!loaderImages[docStores[i].id].includes(imageSrc)) {
                            loaderImages[docStores[i].id].push(imageSrc)
                        }
                        totalChunks += loaders[j]?.totalChunks ?? 0
                        totalChars += loaders[j]?.totalChars ?? 0
                    }
                    docStores[i].totalDocs = loaders?.length ?? 0
                    docStores[i].totalChunks = totalChunks
                    docStores[i].totalChars = totalChars
                }
                setDocStores(docStores)
                setImages(loaderImages)
            } catch (e) {
                console.error(e)
            }
        }
    }, [getAllDocumentStores.data])

    useEffect(() => {
        setLoading(getAllDocumentStores.loading)
    }, [getAllDocumentStores.loading])

    useEffect(() => {
        setError(getAllDocumentStores.error)
    }, [getAllDocumentStores.error])

    return (
        <MainCard>
            {error ? (
                <ErrorBoundary error={error} />
            ) : (
                <Stack flexDirection='column' sx={{ gap: 3 }}>
                    <ViewHeader onSearchChange={onSearchChange} search={true} searchPlaceholder='Search Name' title='Document Store'>
                        <ToggleButtonGroup
                            sx={{ borderRadius: 2, maxHeight: 40 }}
                            value={view}
                            color='primary'
                            exclusive
                            onChange={handleChange}
                        >
                            <ToggleButton
                                sx={{
                                    borderColor: theme.palette.grey[900] + 25,
                                    borderRadius: 2,
                                    color: theme?.customization?.isDarkMode ? 'white' : 'inherit'
                                }}
                                variant='contained'
                                value='card'
                                title='Card View'
                            >
                                <IconLayoutGrid />
                            </ToggleButton>
                            <ToggleButton
                                sx={{
                                    borderColor: theme.palette.grey[900] + 25,
                                    borderRadius: 2,
                                    color: theme?.customization?.isDarkMode ? 'white' : 'inherit'
                                }}
                                variant='contained'
                                value='list'
                                title='List View'
                            >
                                <IconList />
                            </ToggleButton>
                        </ToggleButtonGroup>
                        <StyledButton
                            variant='contained'
                            sx={{ borderRadius: 2, height: '100%' }}
                            onClick={addNew}
                            startIcon={<IconPlus />}
                            id='btn_createVariable'
                        >
                            Add New
                        </StyledButton>
                    </ViewHeader>
                    {!view || view === 'card' ? (
                        <>
                            {isLoading && !docStores ? (
                                <Box display='grid' gridTemplateColumns='repeat(3, 1fr)' gap={gridSpacing}>
                                    <Skeleton variant='rounded' height={160} />
                                    <Skeleton variant='rounded' height={160} />
                                    <Skeleton variant='rounded' height={160} />
                                </Box>
                            ) : (
                                <Box display='grid' gridTemplateColumns='repeat(3, 1fr)' gap={gridSpacing}>
                                    {docStores?.filter(filterDocStores).map((data, index) => (
                                        <DocumentStoreCard
                                            key={index}
                                            images={images[data.id]}
                                            data={data}
                                            onClick={() => goToDocumentStore(data.id)}
                                        />
                                    ))}
                                </Box>
                            )}
                        </>
                    ) : (
                        <TableContainer sx={{ border: 1, borderColor: theme.palette.grey[900] + 25, borderRadius: 2 }} component={Paper}>
                            <Table aria-label='documents table'>
                                <TableHead
                                    sx={{
                                        backgroundColor: customization.isDarkMode ? theme.palette.common.black : theme.palette.grey[100],
                                        height: 56
                                    }}
                                >
                                    <TableRow>
                                        <TableCell>&nbsp;</TableCell>
                                        <TableCell>Name</TableCell>
                                        <TableCell>Description</TableCell>
                                        <TableCell>Connected flows</TableCell>
                                        <TableCell>Total characters</TableCell>
                                        <TableCell>Total chunks</TableCell>
                                        <TableCell>Loader types</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {docStores?.filter(filterDocStores).map((data, index) => (
                                        <TableRow
                                            onClick={() => goToDocumentStore(data.id)}
                                            hover
                                            key={index}
                                            sx={{ cursor: 'pointer', '&:last-child td, &:last-child th': { border: 0 } }}
                                        >
                                            <TableCell align='center'>
                                                <DocumentStoreStatus isTableView={true} status={data.status} />
                                            </TableCell>
                                            <TableCell>
                                                <Typography
                                                    sx={{
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: 5,
                                                        WebkitBoxOrient: 'vertical',
                                                        textOverflow: 'ellipsis',
                                                        overflow: 'hidden'
                                                    }}
                                                >
                                                    {data.name}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography
                                                    sx={{
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: 5,
                                                        WebkitBoxOrient: 'vertical',
                                                        textOverflow: 'ellipsis',
                                                        overflow: 'hidden'
                                                    }}
                                                >
                                                    {data?.description}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>{data.whereUsed?.length ?? 0}</TableCell>
                                            <TableCell>{data.totalChars}</TableCell>
                                            <TableCell>{data.totalChunks}</TableCell>
                                            <TableCell>
                                                {images[data.id] && (
                                                    <Box
                                                        sx={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'start',
                                                            gap: 1
                                                        }}
                                                    >
                                                        {images[data.id].slice(0, images.length > 3 ? 3 : images.length).map((img) => (
                                                            <Box
                                                                key={img}
                                                                sx={{
                                                                    width: 30,
                                                                    height: 30,
                                                                    borderRadius: '50%',
                                                                    backgroundColor: customization.isDarkMode
                                                                        ? theme.palette.common.white
                                                                        : theme.palette.grey[300] + 75
                                                                }}
                                                            >
                                                                <img
                                                                    style={{
                                                                        width: '100%',
                                                                        height: '100%',
                                                                        padding: 5,
                                                                        objectFit: 'contain'
                                                                    }}
                                                                    alt=''
                                                                    src={img}
                                                                />
                                                            </Box>
                                                        ))}
                                                        {images.length > 3 && (
                                                            <Typography
                                                                sx={{
                                                                    alignItems: 'center',
                                                                    display: 'flex',
                                                                    fontSize: '.9rem',
                                                                    fontWeight: 200
                                                                }}
                                                            >
                                                                + {images.length - 3} More
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                    {!isLoading && (!docStores || docStores.length === 0) && (
                        <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection='column'>
                            <Box sx={{ p: 2, height: 'auto' }}>
                                <img
                                    style={{ objectFit: 'cover', height: '16vh', width: 'auto' }}
                                    src={doc_store_empty}
                                    alt='doc_store_empty'
                                />
                            </Box>
                            <div>No Document Stores Created Yet</div>
                        </Stack>
                    )}
                </Stack>
            )}
            {showDialog && (
                <AddDocStoreDialog
                    dialogProps={dialogProps}
                    show={showDialog}
                    onCancel={() => setShowDialog(false)}
                    onConfirm={onConfirm}
                />
            )}
        </MainCard>
    )
}

export default Documents
