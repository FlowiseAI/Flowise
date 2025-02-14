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
import RenderContent from '../chatflows/RenderContent'

// ==============================|| AGENTFLOWS ||============================== //

const Agentflows = () => {
  const [value, setValue] = useState(0)
  const user = useSelector((state) => state.user)
  const isMasterAdmin = user?.role === 'MASTER_ADMIN'
  const isUser = user?.role === 'USER'
  const isAdmin = user?.role === 'ADMIN'
  const isLogin = Boolean(user?.id)
  const navigate = useNavigate()
  const theme = useTheme()

  // const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [images, setImages] = useState({})
  const [search, setSearch] = useState('')

  const getAllAgentflows = useApi(chatflowsApi.getAllAgentflows)
  const getAllPublicAgentflows = useApi(chatflowsApi.getAllPublicAgentflows)
  const getAllAgentflowsOfMasterAdmin = useApi(chatflowsApi.getAllAgentflowsOfAdmin)
  const getAllAgentOfAdminGroup = useApi(chatflowsApi.getAllAgentOfAdminGroup)

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
    if (isLogin && user) {
      getAllAgentflows.request()
      getAllPublicAgentflows.request()
      if (isMasterAdmin) getAllAgentflowsOfMasterAdmin.request()
      if (isAdmin || isUser) getAllAgentOfAdminGroup.request(user.groupname)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLogin, user])

  // useEffect(() => {
  //   setLoading(getAllPublicAgentflows.loading)
  // }, [getAllPublicAgentflows.loading])

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
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={value} onChange={handleChangeTab} aria-label='basic tabs example'>
                  {isLogin && <Tab label={isMasterAdmin ? 'Master Admin' : user.groupname} {...a11yProps(0)} />}
                  <Tab label='Đã public' {...a11yProps(1)} />
                  <Tab label='Cá nhân' {...a11yProps(2)} />
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
                data={isAdmin || isUser ? getAllAgentOfAdminGroup.data : getAllAgentflowsOfMasterAdmin.data}
                // isLoading={isLoading}
                isLoading={getAllAgentOfAdminGroup.loading || getAllAgentflowsOfMasterAdmin.loading}
                filterFunction={filterFlows}
                goToCanvas={goToCanvas}
                images={images}
                view={view}
                setError={setError}
                updateFlowsApi={
                  isAdmin || isUser
                    ? {
                        request: async () => {
                          return await getAllAgentOfAdminGroup.request(user.groupname)
                        }
                      }
                    : getAllAgentflowsOfMasterAdmin
                }
                isAdmin={isMasterAdmin || isAdmin}
                isUser={isUser}
                msgEmpty={`Người dùng chưa tạo agentflows nào trong nhóm ${user.groupname}, tạo mới agentflows`}
                isAgentCanvas
              />
            ) : (
              <div>Đăng nhập để xem danh sách Agents</div>
            )}
          </CustomTabPanel>
          <CustomTabPanel value={value} index={1}>
            {isLogin ? (
              <RenderContent
                data={getAllPublicAgentflows.data}
                // isLoading={isLoading}
                isLoading={getAllPublicAgentflows.loading}
                filterFunction={filterFlows}
                goToCanvas={goToCanvas}
                images={images}
                view={view}
                setError={setError}
                updateFlowsApi={getAllPublicAgentflows}
                isAgentCanvas
              />
            ) : (
              <div>Đăng nhập để xem danh sách Agents</div>
            )}
          </CustomTabPanel>
          <CustomTabPanel value={value} index={2}>
            {isLogin ? (
              <RenderContent
                data={getAllAgentflows.data}
                // isLoading={isLoading}
                isLoading={getAllAgentflows.loading}
                filterFunction={filterFlows}
                goToCanvas={goToCanvas}
                images={images}
                view={view}
                setError={setError}
                updateFlowsApi={getAllAgentflows}
                isAgentCanvas
              />
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
