import { useSelector } from 'react-redux'
import { Stack } from '@mui/material'
import MainCard from 'ui-component/cards/MainCard'
import { BreadcrumbsComponent } from 'ui-component/breadcrumbs-component'
import { useTheme } from '@mui/material/styles'
import { useParams } from 'react-router'
import { SourcesTable } from './SourcesTable'

function Embeddings() {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)

    const params = useParams()
    const crumbs = [
        {
            name: 'Data Sources',
            link: '/sources'
        },
        {
            name: 'Documents',
            link: `/sources/${params?.id}`
        },
        {
            name: 'parts',
            link: `/sources/${params?.id}/documents/${params?.documentId}`
        }
    ]

    const onClickRow = (id) => {}

    const prepareData = (data) => {
        return data.map(({ id, length, tokens, content }) => ({
            id,
            length,
            tokens,
            content
        }))
    }

    return (
        <MainCard sx={{ background: customization.isDarkMode ? theme.palette.common.black : '' }}>
            <Stack flexDirection='column'>
                <BreadcrumbsComponent crumbs={crumbs} />
                <h1> Embeddings page</h1>
                <SourcesTable columns={columns} rows={prepareData(data)} onClickRow={onClickRow} onClose={() => {}} onRefresh={() => {}} />
            </Stack>
        </MainCard>
    )
}

const columns = [
    {
        title: 'Length'
    },
    {
        title: 'Tokens'
    },
    {
        title: 'Content'
    }
]

const data = [
    {
        id: 1,
        length: 412,
        tokens: 521,
        content:
            'Ut mi turpis, aliquam quis eros eu, ullamcorper ultrices turpis. Quisque quis rhoncus enim. Sed quis finibus nisi. Integer a lectus et turpis interdum lacinia in at nibh. Ut ornare sed neque eu venenatis. Nunc pulvinar molestie accumsan. Vivamus eu porttitor ex. Aenean vestibulum sem sem, pretium convallis tortor condimentum et. Vestibulum quis ultrices diam.'
    },
    {
        id: 2,
        length: 152,
        tokens: 321,
        content:
            'Ut mi turpis, aliquam quis eros eu, ullamcorper ultrices turpis. Quisque quis rhoncus enim. Sed quis finibus nisi. Integer a lectus et turpis interdum lacinia in at nibh. Ut ornare sed neque eu venenatis. Nunc pulvinar molestie accumsan. Vivamus eu porttitor ex. Aenean vestibulum sem sem, pretium convallis tortor condimentum et. Vestibulum quis ultrices diam.'
    },
    {
        id: 3,
        length: 231,
        tokens: 333,
        content:
            'Ut mi turpis, aliquam quis eros eu, ullamcorper ultrices turpis. Quisque quis rhoncus enim. Sed quis finibus nisi. Integer a lectus et turpis interdum lacinia in at nibh. Ut ornare sed neque eu venenatis. Nunc pulvinar molestie accumsan. Vivamus eu porttitor ex. Aenean vestibulum sem sem, pretium convallis tortor condimentum et. Vestibulum quis ultrices diam.'
    }
]

export default Embeddings
