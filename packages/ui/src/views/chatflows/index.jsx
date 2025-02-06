import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

// material-ui
import { Box, Stack, Tab, Tabs, ToggleButton, ToggleButtonGroup } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import PropTypes from 'prop-types'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
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
import RenderContent from './RenderContent'

// ==============================|| CHATFLOWS ||============================== //

const Chatflows = () => {
  const [value, setValue] = useState(0)
  const user = useSelector((state) => state.user)
  const isMasterAdmin = user?.role === 'MASTER_ADMIN'
  const isAdmin = user?.role === 'ADMIN'
  const isLogin = Boolean(user?.id)
  const navigate = useNavigate()
  const theme = useTheme()

  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [images, setImages] = useState({})
  const [search, setSearch] = useState('')

  const getAllChatflowsApi = useApi(chatflowsApi.getAllChatflows)
  const getAllPublicChatflows = useApi(chatflowsApi.getAllPublicChatflows)
  const getAllChatflowsOfAdmin = useApi(chatflowsApi.getAllChatflowsOfAdmin)
  const getAllChatflowsOfAdminGroup = useApi(chatflowsApi.getAllChatflowsOfAdminGroup)

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
      if (isMasterAdmin) getAllChatflowsOfAdmin.request()
      if (isAdmin && user) getAllChatflowsOfAdminGroup.request(user.groupname)
    }
  }, [isLogin, user])

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
                  <Tab label='Đã publish' {...a11yProps(0)} />
                  <Tab label='Cá nhân' {...a11yProps(1)} />
                  {(isMasterAdmin || isAdmin) && <Tab label='Admin' {...a11yProps(2)} />}
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
              <RenderContent
                data={getAllPublicChatflows.data}
                isLoading={isLoading}
                filterFunction={filterFlows}
                goToCanvas={goToCanvas}
                images={images}
                view={view}
                setError={setError}
                updateFlowsApi={getAllPublicChatflows}
              />
            ) : (
              <div>Đăng nhập để xem danh sách Chatflows</div>
            )}
          </CustomTabPanel>
          <CustomTabPanel value={value} index={1}>
            {isLogin ? (
              <RenderContent
                data={getAllChatflowsApi.data}
                isLoading={isLoading}
                filterFunction={filterFlows}
                goToCanvas={goToCanvas}
                images={images}
                view={view}
                setError={setError}
                updateFlowsApi={getAllChatflowsApi}
              />
            ) : (
              <div>Đăng nhập để xem danh sách Chatflows</div>
            )}
          </CustomTabPanel>
          <CustomTabPanel value={value} index={2}>
            {isLogin ? (
              <RenderContent
                data={isAdmin ? getAllChatflowsOfAdminGroup.data : getAllChatflowsOfAdmin.data}
                isLoading={isLoading}
                filterFunction={filterFlows}
                goToCanvas={goToCanvas}
                images={images}
                view={view}
                setError={setError}
                updateFlowsApi={isAdmin ? getAllChatflowsOfAdminGroup : getAllChatflowsOfAdmin}
                isAdmin={isMasterAdmin || isAdmin}
              />
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
