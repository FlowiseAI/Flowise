import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'

// material-ui
import { Grid, Box, Stack } from '@mui/material'
import { useTheme } from '@mui/material/styles'

// project imports
import MainCard from 'ui-component/cards/MainCard'
import ItemCard from 'ui-component/cards/ItemCard'
import { gridSpacing } from 'store/constant'
import WorkflowEmptySVG from 'assets/images/workflow_empty.svg'

// API
import marketplacesApi from 'api/marketplaces'

// Hooks
import useApi from 'hooks/useApi'

// const
import { baseURL } from 'store/constant'

// ==============================|| Marketplace ||============================== //

const Marketplace = () => {
    const navigate = useNavigate()

    const theme = useTheme()
    const customization = useSelector((state) => state.customization)

    const [isLoading, setLoading] = useState(true)
    const [images, setImages] = useState({})

    const getAllMarketplacesApi = useApi(marketplacesApi.getAllMarketplaces)

    const goToCanvas = (selectedChatflow) => {
        navigate(`/marketplace/${selectedChatflow.id}`, { state: selectedChatflow })
    }

    useEffect(() => {
        getAllMarketplacesApi.request()

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        setLoading(getAllMarketplacesApi.loading)
    }, [getAllMarketplacesApi.loading])

    useEffect(() => {
        if (getAllMarketplacesApi.data) {
            try {
                const chatflows = getAllMarketplacesApi.data
                const images = {}
                for (let i = 0; i < chatflows.length; i += 1) {
                    const flowDataStr = chatflows[i].flowData
                    const flowData = JSON.parse(flowDataStr)
                    const nodes = flowData.nodes || []
                    images[chatflows[i].id] = []
                    for (let j = 0; j < nodes.length; j += 1) {
                        const imageSrc = `${baseURL}/api/v1/node-icon/${nodes[j].data.name}`
                        if (!images[chatflows[i].id].includes(imageSrc)) {
                            images[chatflows[i].id].push(imageSrc)
                        }
                    }
                }
                setImages(images)
            } catch (e) {
                console.error(e)
            }
        }
    }, [getAllMarketplacesApi.data])

    return (
        <MainCard sx={{ background: customization.isDarkMode ? theme.palette.common.black : '' }}>
            <Stack flexDirection='row'>
                <h1>Marketplace</h1>
            </Stack>
            <Grid container spacing={gridSpacing}>
                {!isLoading &&
                    getAllMarketplacesApi.data &&
                    getAllMarketplacesApi.data.map((data, index) => (
                        <Grid key={index} item lg={3} md={4} sm={6} xs={12}>
                            <ItemCard onClick={() => goToCanvas(data)} data={data} images={images[data.id]} />
                        </Grid>
                    ))}
            </Grid>
            {!isLoading && (!getAllMarketplacesApi.data || getAllMarketplacesApi.data.length === 0) && (
                <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection='column'>
                    <Box sx={{ p: 2, height: 'auto' }}>
                        <img style={{ objectFit: 'cover', height: '30vh', width: 'auto' }} src={WorkflowEmptySVG} alt='WorkflowEmptySVG' />
                    </Box>
                    <div>No Marketplace Yet</div>
                </Stack>
            )}
        </MainCard>
    )
}

export default Marketplace
