import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

// material-ui
import { Box, Stack, ToggleButton, ToggleButtonGroup } from '@mui/material'
import { useTheme } from '@mui/material/styles'

// project imports
import ErrorBoundary from '@/ErrorBoundary'
import { useError } from '@/store/context/ErrorContext'
import MainCard from '@/ui-component/cards/MainCard'
import TablePagination, { DEFAULT_ITEMS_PER_PAGE } from '@/ui-component/pagination/TablePagination'
import DocumentStoreCard from '@/ui-component/cards/DocumentStoreCard'
import AddDocStoreDialog from '@/views/docstore/AddDocStoreDialog'
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import { StyledPermissionButton } from '@/ui-component/button/RBACButtons'

// API
import useApi from '@/hooks/useApi'
import documentsApi from '@/api/documentstore'

// icons
import { IconPlus, IconLayoutGrid, IconList } from '@tabler/icons-react'
import doc_store_empty from '@/assets/images/doc_store_empty.svg'

// const
import { baseURL, gridSpacing } from '@/store/constant'
import { DocumentStoreTable } from '@/ui-component/table/DocumentStoreTable'

// ==============================|| DOCUMENTS ||============================== //

const Documents = () => {
    const theme = useTheme()

    const navigate = useNavigate()
    const getAllDocumentStores = useApi(documentsApi.getAllDocumentStores)
    const { error } = useError()

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
        return (
            data.name.toLowerCase().indexOf(search.toLowerCase()) > -1 || data.description.toLowerCase().indexOf(search.toLowerCase()) > -1
        )
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
        applyFilters(currentPage, pageLimit)
    }

    useEffect(() => {
        applyFilters(currentPage, pageLimit)

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    /* Table Pagination */
    const [currentPage, setCurrentPage] = useState(1)
    const [pageLimit, setPageLimit] = useState(DEFAULT_ITEMS_PER_PAGE)
    const [total, setTotal] = useState(0)
    const onChange = (page, pageLimit) => {
        setCurrentPage(page)
        setPageLimit(pageLimit)
        applyFilters(page, pageLimit)
    }

    const applyFilters = (page, limit) => {
        setLoading(true)
        const params = {
            page: page || currentPage,
            limit: limit || pageLimit
        }
        getAllDocumentStores.request(params)
    }

    useEffect(() => {
        if (getAllDocumentStores.data) {
            try {
                const { data, total } = getAllDocumentStores.data
                if (!Array.isArray(data)) return
                const loaderImages = {}

                for (let i = 0; i < data.length; i += 1) {
                    const loaders = data[i].loaders ?? []

                    let totalChunks = 0
                    let totalChars = 0
                    loaderImages[data[i].id] = []
                    for (let j = 0; j < loaders.length; j += 1) {
                        const imageSrc = `${baseURL}/api/v1/node-icon/${loaders[j].loaderId}`
                        if (!loaderImages[data[i].id].includes(imageSrc)) {
                            loaderImages[data[i].id].push(imageSrc)
                        }
                        totalChunks += loaders[j]?.totalChunks ?? 0
                        totalChars += loaders[j]?.totalChars ?? 0
                    }
                    data[i].totalDocs = loaders?.length ?? 0
                    data[i].totalChunks = totalChunks
                    data[i].totalChars = totalChars
                }
                setDocStores(data)
                setTotal(total)
                setImages(loaderImages)
            } catch (e) {
                console.error(e)
            }
        }
    }, [getAllDocumentStores.data])

    useEffect(() => {
        setLoading(getAllDocumentStores.loading)
    }, [getAllDocumentStores.loading])

    const hasDocStores = docStores && docStores.length > 0

    return (
        <MainCard>
            {error ? (
                <ErrorBoundary error={error} />
            ) : (
                <Stack flexDirection='column' sx={{ gap: 3 }}>
                    <ViewHeader
                        onSearchChange={onSearchChange}
                        search={hasDocStores}
                        searchPlaceholder='Search Name'
                        title='Document Store'
                        description='Store and upsert documents for LLM retrieval (RAG)'
                    >
                        {hasDocStores && (
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
                        )}
                        <StyledPermissionButton
                            permissionId={'documentStores:create'}
                            variant='contained'
                            sx={{ borderRadius: 2, height: '100%' }}
                            onClick={addNew}
                            startIcon={<IconPlus />}
                            id='btn_createVariable'
                        >
                            Add New
                        </StyledPermissionButton>
                    </ViewHeader>
                    {!hasDocStores ? (
                        <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection='column'>
                            <Box sx={{ p: 2, height: 'auto' }}>
                                <img
                                    style={{ objectFit: 'cover', height: '20vh', width: 'auto' }}
                                    src={doc_store_empty}
                                    alt='doc_store_empty'
                                />
                            </Box>
                            <div>No Document Stores Created Yet</div>
                        </Stack>
                    ) : (
                        <React.Fragment>
                            {!view || view === 'card' ? (
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
                            ) : (
                                <DocumentStoreTable
                                    isLoading={isLoading}
                                    data={docStores?.filter(filterDocStores)}
                                    images={images}
                                    onRowClick={(row) => goToDocumentStore(row.id)}
                                />
                            )}
                            {/* Pagination and Page Size Controls */}
                            <TablePagination currentPage={currentPage} limit={pageLimit} total={total} onChange={onChange} />
                        </React.Fragment>
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
