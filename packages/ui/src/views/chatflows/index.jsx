import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

// material-ui
import { Box, Skeleton, Stack, Tab, Tabs, ToggleButton, ToggleButtonGroup } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import PropTypes from 'prop-types'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import ItemCard from '@/ui-component/cards/ItemCard'
import { gridSpacing } from '@/store/constant'
import WorkflowEmptySVG from '@/assets/images/workflow_empty.svg'
import { FlowListTable } from '@/ui-component/table/FlowListTable'
import { StyledButton } from '@/ui-component/button/StyledButton'
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import ErrorBoundary from '@/ErrorBoundary'

// API
import chatflowsApi from '@/api/chatflows'

// Hooks
import useApi from '@/hooks/useApi'

// const
import { baseURL } from '@/store/constant'

// icons
import { IconPlus, IconLayoutGrid, IconList } from '@tabler/icons-react'
import { useSelector } from 'react-redux'

// ==============================|| CHATFLOWS ||============================== //

const Chatflows = () => {
  const [value, setValue] = useState(0)
  const user = useSelector((state) => state.user)
  const isLogin = Boolean(user?.id)
  const navigate = useNavigate()
  const theme = useTheme()

  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [images, setImages] = useState({})
  const [search, setSearch] = useState('')

  const getAllChatflowsApi = useApi(chatflowsApi.getAllChatflows)
  const getAllPublicChatflows = useApi(chatflowsApi.getAllPublicChatflows)

  const [view, setView] = useState(localStorage.getItem('flowDisplayStyle') || 'card')

  const handleChangeTab = (event, newValue) => {
    setValue(newValue)
  }

  const handleChange = (event, nextView) => {
    if (nextView === null) return
    localStorage.setItem('flowDisplayStyle', nextView)
    setView(nextView)
  }

  const onSearchChange = (event) => {
    setSearch(event.target.value)
  }

  const filterFlows = (data) => {
    const searchLower = search.toLowerCase()
    return data.name.toLowerCase().includes(searchLower) || (data.category && data.category.toLowerCase().includes(searchLower))
  }

  const addNew = () => {
    navigate('/canvas')
  }

  const goToCanvas = (selectedChatflow) => {
    navigate(`/canvas/${selectedChatflow.id}`)
  }

  useEffect(() => {
    if (isLogin) {
      getAllChatflowsApi.request()
      getAllPublicChatflows.request()
    }
  }, [isLogin])

  useEffect(() => {
    setLoading(getAllPublicChatflows.loading)
  }, [getAllPublicChatflows.loading])

  useEffect(() => {
    if (getAllChatflowsApi.data) {
      try {
        const chatflows = getAllChatflowsApi.data
        const images = {}
        chatflows.forEach((chatflow) => {
          const flowData = JSON.parse(chatflow.flowData)
          const nodes = flowData.nodes || []
          images[chatflow.id] = nodes.map((node) => `${baseURL}/api/v1/node-icon/${node.data.name}`)
        })
        setImages(images)
      } catch (e) {
        console.error(e)
      }
    }
  }, [getAllChatflowsApi.data])

  const renderContent = (data, isLoading, filterFunction, updateFlowsApi) => (
    <>
      {view === 'card' ? (
        isLoading ? (
          <Box display='grid' gridTemplateColumns='repeat(3, 1fr)' gap={gridSpacing}>
            <Skeleton variant='rounded' height={160} />
            <Skeleton variant='rounded' height={160} />
            <Skeleton variant='rounded' height={160} />
          </Box>
        ) : (
          <Box display='grid' gridTemplateColumns='repeat(3, 1fr)' gap={gridSpacing}>
            {data?.filter(filterFunction).map((item, index) => (
              <ItemCard key={index} onClick={() => goToCanvas(item)} data={item} images={images[item.id]} />
            ))}
          </Box>
        )
      ) : (
        <FlowListTable
          data={data}
          images={images}
          isLoading={isLoading}
          filterFunction={filterFunction}
          updateFlowsApi={updateFlowsApi}
          setError={setError}
        />
      )}
      {!isLoading && (!data || data.length === 0) && (
        <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection='column'>
          <Box sx={{ p: 2, height: 'auto' }}>
            <img style={{ objectFit: 'cover', height: '25vh', width: 'auto' }} src={WorkflowEmptySVG} alt='WorkflowEmptySVG' />
          </Box>
          <div>Người dùng chưa tạo chatflow nào, tạo mới chatflow</div>
        </Stack>
      )}
    </>
  )

  return (
    <MainCard>
      {error ? (
        <ErrorBoundary error={error} />
      ) : (
        <Stack flexDirection='column' sx={{ gap: 3 }}>
          <ViewHeader
            onSearchChange={onSearchChange}
            search={true}
            searchPlaceholder='Search Name or Category'
            title={
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={value} onChange={handleChangeTab} aria-label='basic tabs example'>
                  <Tab label='Publish' {...a11yProps(0)} />
                  <Tab label='Private' {...a11yProps(1)} />
                </Tabs>
              </Box>
            }
          >
            <ToggleButtonGroup sx={{ borderRadius: 2, maxHeight: 40 }} value={view} color='primary' exclusive onChange={handleChange}>
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
              disabled={!isLogin}
              variant='contained'
              onClick={addNew}
              startIcon={<IconPlus />}
              sx={{ borderRadius: 2, height: 40 }}
            >
              Add New
            </StyledButton>
          </ViewHeader>

          <CustomTabPanel value={value} index={0}>
            {isLogin ? (
              renderContent(getAllPublicChatflows.data, isLoading, filterFlows, getAllPublicChatflows)
            ) : (
              <div>Đăng nhập để xem danh sách Chatflows</div>
            )}
          </CustomTabPanel>
          <CustomTabPanel value={value} index={1}>
            {isLogin ? (
              renderContent(getAllChatflowsApi.data, isLoading, filterFlows, getAllChatflowsApi)
            ) : (
              <div>Đăng nhập để xem danh sách Chatflows</div>
            )}
          </CustomTabPanel>
        </Stack>
      )}
    </MainCard>
  )
}

function a11yProps(index) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`
  }
}

function CustomTabPanel(props) {
  const { children, value, index, ...other } = props

  return (
    <div role='tabpanel' hidden={value !== index} id={`simple-tabpanel-${index}`} aria-labelledby={`simple-tab-${index}`} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}
CustomTabPanel.propTypes = {
  children: PropTypes.node,
  value: PropTypes.number.isRequired,
  index: PropTypes.number.isRequired
}

export default Chatflows
