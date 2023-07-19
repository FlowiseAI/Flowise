import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import PropTypes from 'prop-types'

// material-ui
import { Grid, Box, Stack, Tabs, Tab } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { IconHierarchy, IconTool } from '@tabler/icons'

// project imports
import MainCard from 'ui-component/cards/MainCard'
import ItemCard from 'ui-component/cards/ItemCard'
import { gridSpacing } from 'store/constant'
import WorkflowEmptySVG from 'assets/images/workflow_empty.svg'
import ToolDialog from 'views/tools/ToolDialog'

// API
import marketplacesApi from 'api/marketplaces'

// Hooks
import useApi from 'hooks/useApi'

// const
import { baseURL } from 'store/constant'

function TabPanel(props) {
    const { children, value, index, ...other } = props
    return (
        <div
            role='tabpanel'
            hidden={value !== index}
            id={`attachment-tabpanel-${index}`}
            aria-labelledby={`attachment-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ p: 1 }}>{children}</Box>}
        </div>
    )
}

TabPanel.propTypes = {
    children: PropTypes.node,
    index: PropTypes.number.isRequired,
    value: PropTypes.number.isRequired
}

// ==============================|| Marketplace ||============================== //

const Marketplace = () => {
    const navigate = useNavigate()

    const theme = useTheme()
    const customization = useSelector((state) => state.customization)

    const [isChatflowsLoading, setChatflowsLoading] = useState(true)
    const [isToolsLoading, setToolsLoading] = useState(true)
    const [images, setImages] = useState({})
    const tabItems = ['Chatflows', 'Tools']
    const [value, setValue] = useState(0)
    const [showToolDialog, setShowToolDialog] = useState(false)
    const [toolDialogProps, setToolDialogProps] = useState({})

    const getAllChatflowsMarketplacesApi = useApi(marketplacesApi.getAllChatflowsMarketplaces)
    const getAllToolsMarketplacesApi = useApi(marketplacesApi.getAllToolsMarketplaces)

    const onUseTemplate = (selectedTool) => {
        const dialogProp = {
            title: 'Add New Tool',
            type: 'IMPORT',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Add',
            data: selectedTool
        }
        setToolDialogProps(dialogProp)
        setShowToolDialog(true)
    }

    const goToTool = (selectedTool) => {
        const dialogProp = {
            title: selectedTool.templateName,
            type: 'TEMPLATE',
            data: selectedTool
        }
        setToolDialogProps(dialogProp)
        setShowToolDialog(true)
    }

    const goToCanvas = (selectedChatflow) => {
        navigate(`/marketplace/${selectedChatflow.id}`, { state: selectedChatflow })
    }

    const handleChange = (event, newValue) => {
        setValue(newValue)
    }

    useEffect(() => {
        getAllChatflowsMarketplacesApi.request()
        getAllToolsMarketplacesApi.request()

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        setChatflowsLoading(getAllChatflowsMarketplacesApi.loading)
    }, [getAllChatflowsMarketplacesApi.loading])

    useEffect(() => {
        setToolsLoading(getAllToolsMarketplacesApi.loading)
    }, [getAllToolsMarketplacesApi.loading])

    useEffect(() => {
        if (getAllChatflowsMarketplacesApi.data) {
            try {
                const chatflows = getAllChatflowsMarketplacesApi.data
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
    }, [getAllChatflowsMarketplacesApi.data])

    return (
        <>
            <MainCard sx={{ background: customization.isDarkMode ? theme.palette.common.black : '' }}>
                <Stack flexDirection='row'>
                    <h1>Marketplace</h1>
                </Stack>
                <Tabs sx={{ mb: 2 }} variant='fullWidth' value={value} onChange={handleChange} aria-label='tabs'>
                    {tabItems.map((item, index) => (
                        <Tab
                            key={index}
                            icon={index === 0 ? <IconHierarchy /> : <IconTool />}
                            iconPosition='start'
                            label={<span style={{ fontSize: '1.1rem' }}>{item}</span>}
                        />
                    ))}
                </Tabs>
                {tabItems.map((item, index) => (
                    <TabPanel key={index} value={value} index={index}>
                        {item === 'Chatflows' && (
                            <Grid container spacing={gridSpacing}>
                                {!isChatflowsLoading &&
                                    getAllChatflowsMarketplacesApi.data &&
                                    getAllChatflowsMarketplacesApi.data.map((data, index) => (
                                        <Grid key={index} item lg={3} md={4} sm={6} xs={12}>
                                            <ItemCard onClick={() => goToCanvas(data)} data={data} images={images[data.id]} />
                                        </Grid>
                                    ))}
                            </Grid>
                        )}
                        {item === 'Tools' && (
                            <Grid container spacing={gridSpacing}>
                                {!isToolsLoading &&
                                    getAllToolsMarketplacesApi.data &&
                                    getAllToolsMarketplacesApi.data.map((data, index) => (
                                        <Grid key={index} item lg={3} md={4} sm={6} xs={12}>
                                            <ItemCard data={data} onClick={() => goToTool(data)} />
                                        </Grid>
                                    ))}
                            </Grid>
                        )}
                    </TabPanel>
                ))}
                {!isChatflowsLoading && (!getAllChatflowsMarketplacesApi.data || getAllChatflowsMarketplacesApi.data.length === 0) && (
                    <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection='column'>
                        <Box sx={{ p: 2, height: 'auto' }}>
                            <img
                                style={{ objectFit: 'cover', height: '30vh', width: 'auto' }}
                                src={WorkflowEmptySVG}
                                alt='WorkflowEmptySVG'
                            />
                        </Box>
                        <div>No Marketplace Yet</div>
                    </Stack>
                )}
                {!isToolsLoading && (!getAllToolsMarketplacesApi.data || getAllToolsMarketplacesApi.data.length === 0) && (
                    <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection='column'>
                        <Box sx={{ p: 2, height: 'auto' }}>
                            <img
                                style={{ objectFit: 'cover', height: '30vh', width: 'auto' }}
                                src={WorkflowEmptySVG}
                                alt='WorkflowEmptySVG'
                            />
                        </Box>
                        <div>No Marketplace Yet</div>
                    </Stack>
                )}
            </MainCard>
            <ToolDialog
                show={showToolDialog}
                dialogProps={toolDialogProps}
                onCancel={() => setShowToolDialog(false)}
                onConfirm={() => setShowToolDialog(false)}
                onUseTemplate={(tool) => onUseTemplate(tool)}
            ></ToolDialog>
        </>
    )
}

export default Marketplace
