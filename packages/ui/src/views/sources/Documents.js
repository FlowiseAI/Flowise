import { useSelector } from 'react-redux'
import { IconButton, Stack } from '@mui/material'
import MainCard from 'ui-component/cards/MainCard'
import { BreadcrumbsComponent } from 'ui-component/breadcrumbs-component'
import { useTheme } from '@mui/material/styles'
import { useNavigate, useParams } from 'react-router'
import { SourcesTable } from './SourcesTable'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import CachedIcon from '@mui/icons-material/Cached'
import CloseIcon from '@mui/icons-material/Close'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'

function Documents() {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)

    const params = useParams()
    const navigate = useNavigate()
    const onClickRow = (id) => navigate(`/sources/${id}/documents/${id}/parts`)

    const crumbs = [
        {
            name: 'Data Sources',
            link: '/sources'
        },
        {
            name: 'Documents',
            link: `/sources/${params?.id}/documents`
        }
    ]

    const prepareData = (data) => {
        return data.map(({ id, loaded, title, location, documents, type }) => ({
            id,
            status: loaded ? <CheckCircleOutlineIcon color='success' /> : <ErrorOutlineIcon color='error' />,
            title,
            location,
            documents: `${documents.loaded} (${documents.total})`,
            type,
            refreshing: (
                <IconButton>
                    <CachedIcon />
                </IconButton>
            ),
            delete: (
                <IconButton>
                    <CloseIcon />
                </IconButton>
            )
        }))
    }

    return (
        <MainCard sx={{ background: customization.isDarkMode ? theme.palette.common.black : '' }}>
            <Stack flexDirection='column'>
                <BreadcrumbsComponent crumbs={crumbs} />
                <h1> Documents </h1>
                <SourcesTable columns={columns} rows={prepareData(data)} onClickRow={onClickRow} onClose={() => {}} onRefresh={() => {}} />
            </Stack>
        </MainCard>
    )
}

const columns = [
    {
        title: ''
    },
    {
        title: 'Documents'
    },
    {
        title: 'Path'
    },
    {
        title: 'Sources'
    },
    {
        title: 'Content'
    },
    {
        title: ''
    },
    {
        title: ''
    }
]

const data = [
    {
        id: 1,
        loaded: true,
        title: 'Lorem ipsum',
        location: '/path/to/documents',
        documents: {
            loaded: 23,
            total: 32
        },
        type: 'folder'
    },
    {
        id: 2,
        loaded: true,
        title: 'Lorem ipsum',
        location: '/path/to/documents',
        documents: {
            loaded: 65,
            total: 65
        },
        type: 'folder'
    },
    {
        id: 3,
        loaded: false,
        title: 'Title 3',
        location: '/path/to/documents',
        documents: {
            loaded: 0,
            total: 5
        },
        type: 'folder'
    }
]

export default Documents
