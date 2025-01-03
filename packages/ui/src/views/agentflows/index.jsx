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
import AgentsEmptySVG from '@/assets/images/agents_empty.svg'
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

// ==============================|| AGENTS ||============================== //

const Agentflows = () => {
  const [value, setValue] = useState(0)
  const user = useSelector((state) => state.user)
  const isLogin = user?.id ? true : false
  const navigate = useNavigate()
  const theme = useTheme()

  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [images, setImages] = useState({})
  const [search, setSearch] = useState('')

  const getAllAgentflows = useApi(chatflowsApi.getAllAgentflows)
  const getAllPublicAgentflows = useApi(chatflowsApi.getAllPublicAgentflows)
  const [view, setView] = useState(localStorage.getItem('flowDisplayStyle') || 'card')

  const handleChange = (event, nextView) => {
    if (nextView === null) return
    localStorage.setItem('flowDisplayStyle', nextView)
    setView(nextView)
  }

  const handleChangeTab = (event, newValue) => {
    setValue(newValue)
  }

  const onSearchChange = (event) => {
    setSearch(event.target.value)
  }

  function filterFlows(data) {
    return (
      data.name.toLowerCase().indexOf(search.toLowerCase()) > -1 ||
      (data.category && data.category.toLowerCase().indexOf(search.toLowerCase()) > -1)
    )
  }

  const addNew = () => {
    navigate('/agentcanvas')
  }

  const goToCanvas = (selectedAgentflow) => {
    navigate(`/agentcanvas/${selectedAgentflow.id}`)
  }

  useEffect(() => {
    if (isLogin) {
      getAllAgentflows.request()
      getAllPublicAgentflows.request()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLogin])

  useEffect(() => {
    setLoading(getAllPublicAgentflows.loading)
  }, [getAllPublicAgentflows.loading])

  useEffect(() => {
    if (getAllAgentflows.data) {
      try {
        const agentflows = getAllAgentflows.data
        const images = {}
        for (let i = 0; i < agentflows.length; i += 1) {
          const flowDataStr = agentflows[i].flowData
          const flowData = JSON.parse(flowDataStr)
          const nodes = flowData.nodes || []
          images[agentflows[i].id] = []
          for (let j = 0; j < nodes.length; j += 1) {
            const imageSrc = `${baseURL}/api/v1/node-icon/${nodes[j].data.name}`
            if (!images[agentflows[i].id].includes(imageSrc)) {
              images[agentflows[i].id].push(imageSrc)
            }
          }
        }
        setImages(images)
      } catch (e) {
        console.error(e)
      }
    }
  }, [getAllAgentflows.data])

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
              <>
                {' '}
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                  <Tabs value={value} onChange={handleChangeTab} aria-label='basic tabs example'>
                    <Tab label='Publish' {...a11yProps(0)} />
                    <Tab label='Private' {...a11yProps(1)} />
                  </Tabs>
                </Box>
              </>
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
            {(!view || view === 'card') && isLogin ? (
              <>
                {isLoading && !getAllPublicAgentflows.data ? (
                  <Box display='grid' gridTemplateColumns='repeat(3, 1fr)' gap={gridSpacing}>
                    <Skeleton variant='rounded' height={160} />
                    <Skeleton variant='rounded' height={160} />
                    <Skeleton variant='rounded' height={160} />
                  </Box>
                ) : (
                  <Box display='grid' gridTemplateColumns='repeat(3, 1fr)' gap={gridSpacing}>
                    {getAllPublicAgentflows.data?.filter(filterFlows).map((data, index) => (
                      <ItemCard key={index} onClick={() => goToCanvas(data)} data={data} images={images[data.id]} />
                    ))}
                  </Box>
                )}
              </>
            ) : (
              isLogin && (
                <FlowListTable
                  isAgentCanvas={true}
                  data={getAllPublicAgentflows.data}
                  images={images}
                  isLoading={isLoading}
                  filterFunction={filterFlows}
                  updateFlowsApi={getAllPublicAgentflows}
                  setError={setError}
                />
              )
            )}
            {isLogin ? (
              !isLoading &&
              (!getAllPublicAgentflows.data || getAllPublicAgentflows.data.length === 0) && (
                <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection='column'>
                  <Box sx={{ p: 2, height: 'auto' }}>
                    <img style={{ objectFit: 'cover', height: '12vh', width: 'auto' }} src={AgentsEmptySVG} alt='AgentsEmptySVG' />
                  </Box>
                  <div>Người dùng chưa tạo agent nào, tạo mới agent</div>
                </Stack>
              )
            ) : (
              <div>Đăng nhập để xem danh sách Agents</div>
            )}
          </CustomTabPanel>
          <CustomTabPanel value={value} index={1}>
            {(!view || view === 'card') && isLogin ? (
              <>
                {isLoading && !getAllAgentflows.data ? (
                  <Box display='grid' gridTemplateColumns='repeat(3, 1fr)' gap={gridSpacing}>
                    <Skeleton variant='rounded' height={160} />
                    <Skeleton variant='rounded' height={160} />
                    <Skeleton variant='rounded' height={160} />
                  </Box>
                ) : (
                  <Box display='grid' gridTemplateColumns='repeat(3, 1fr)' gap={gridSpacing}>
                    {getAllAgentflows.data?.filter(filterFlows).map((data, index) => (
                      <ItemCard key={index} onClick={() => goToCanvas(data)} data={data} images={images[data.id]} />
                    ))}
                  </Box>
                )}
              </>
            ) : (
              isLogin && (
                <FlowListTable
                  isAgentCanvas={true}
                  data={getAllAgentflows.data}
                  images={images}
                  isLoading={isLoading}
                  filterFunction={filterFlows}
                  updateFlowsApi={getAllAgentflows}
                  setError={setError}
                />
              )
            )}
            {isLogin ? (
              !isLoading &&
              (!getAllAgentflows.data || getAllAgentflows.data.length === 0) && (
                <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection='column'>
                  <Box sx={{ p: 2, height: 'auto' }}>
                    <img style={{ objectFit: 'cover', height: '12vh', width: 'auto' }} src={AgentsEmptySVG} alt='AgentsEmptySVG' />
                  </Box>
                  <div>Người dùng chưa tạo agent nào, tạo mới agent</div>
                </Stack>
              )
            ) : (
              <div>Đăng nhập để xem danh sách Agents</div>
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

export default Agentflows
