import { useSelector } from 'react-redux'
import { Button, Grid, IconButton, Stack } from '@mui/material'
import MainCard from 'ui-component/cards/MainCard'
import { useTheme } from '@mui/material/styles'
import { useNavigate } from 'react-router-dom'
import { SourcesTable } from './SourcesTable'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import CachedIcon from '@mui/icons-material/Cached'
import CloseIcon from '@mui/icons-material/Close'

export default function Sources() {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)

    const navigate = useNavigate()
    const onClickRow = (id) => navigate(`/sources/${id}/documents`)

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
                <Grid container alignItems='center' justifyContent='space-between'>
                    <h1>Data Sources</h1>
                    <Button variant='contained'>Add Source</Button>
                </Grid>

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
        title: 'Source Title'
    },
    {
        title: 'Location'
    },
    {
        title: 'Documents'
    },
    {
        title: 'Type'
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
    },
    {
        id: 4,
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
        id: 5,
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
        id: 6,
        loaded: false,
        title: 'Title 123',
        location: '/path/to/documents',
        documents: {
            loaded: 1,
            total: 5
        },
        type: 'folder'
    },
    {
        id: 7,
        loaded: true,
        title: 'Lore fasfam ipsum',
        location: '/path/to/documents',
        documents: {
            loaded: 23,
            total: 32
        },
        type: 'folder'
    },
    {
        id: 8,
        loaded: true,
        title: 'Lorem ipsufasm',
        location: '/path/to/documents',
        documents: {
            loaded: 65,
            total: 65
        },
        type: 'folder'
    },
    {
        id: 9,
        loaded: false,
        title: 'Title 3',
        location: '/path/to/documents',
        documents: {
            loaded: 1,
            total: 5
        },
        type: 'folder'
    },
    {
        id: 10,
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
        id: 12,
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
        id: 13,
        loaded: false,
        title: 'Title 3',
        location: '/path/to/documents',
        documents: {
            loaded: 1,
            total: 5
        },
        type: 'folder'
    },
    {
        id: 11,
        loaded: true,
        title: 'Lorem ipsum',
        location: '/path/to/documents',
        documents: {
            loaded: 23,
            total: 32
        },
        type: 'folder'
    }
]
