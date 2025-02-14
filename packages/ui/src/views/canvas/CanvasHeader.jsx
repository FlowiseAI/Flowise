import PropTypes from 'prop-types'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { useEffect, useRef, useState } from 'react'

// material-ui
import { useTheme } from '@mui/material/styles'
import { Avatar, Box, ButtonBase, Typography, Stack, TextField, Button, Switch, MenuItem } from '@mui/material'

// icons
import { IconSettings, IconChevronLeft, IconDeviceFloppy, IconPencil, IconCheck, IconX, IconCode } from '@tabler/icons-react'

// project imports
import Settings from '@/views/settings'
import SaveChatflowDialog from '@/ui-component/dialog/SaveChatflowDialog'
import APICodeDialog from '@/views/chatflows/APICodeDialog'
import ViewMessagesDialog from '@/ui-component/dialog/ViewMessagesDialog'
import ChatflowConfigurationDialog from '@/ui-component/dialog/ChatflowConfigurationDialog'
import UpsertHistoryDialog from '@/views/vectorstore/UpsertHistoryDialog'

// API
import chatflowsApi from '@/api/chatflows'
import userApi from '@/api/user'

// Hooks
import useApi from '@/hooks/useApi'

// utils
import { generateExportFlowData } from '@/utils/genericHelper'
import { uiBaseURL } from '@/store/constant'
import { closeSnackbar as closeSnackbarAction, enqueueSnackbar as enqueueSnackbarAction, SET_CHATFLOW } from '@/store/actions'
import ViewLeadsDialog from '@/ui-component/dialog/ViewLeadsDialog'
import ExportAsTemplateDialog from '@/ui-component/dialog/ExportAsTemplateDialog'
import { TooltipWithParser } from '@/ui-component/tooltip/TooltipWithParser'

// ==============================|| CANVAS HEADER ||============================== //

const CanvasHeader = ({ chatflow, isAgentCanvas, handleSaveFlow, handleDeleteFlow, handleLoadFlow }) => {
  const theme = useTheme()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const flowNameRef = useRef()
  const settingsRef = useRef()

  const user = useSelector((state) => state.user)
  const { pathname } = useLocation()
  const isMasterAdmin = user?.role === 'MASTER_ADMIN'
  const [isAdminPage, setIsAdminPage] = useState(
    pathname === '/canvas' || pathname === '/agentcanvas'
      ? true
      : user?.role === 'MASTER_ADMIN' || (user?.role === 'ADMIN' && user.groupname === chatflow?.user?.groupname)
  )
  const isAdmin =
    user?.role === 'MASTER_ADMIN' ||
    (user?.role === 'ADMIN' && (user?.groupname === chatflow?.user?.groupname || user?.groupname === chatflow?.groupname))

  const [isPublicChatflow, setChatflowIsPublic] = useState(chatflow?.isPublic ?? false)
  const [isEditingFlowName, setEditingFlowName] = useState(null)
  const [flowName, setFlowName] = useState('')
  const [isSettingsOpen, setSettingsOpen] = useState(false)
  const [flowDialogOpen, setFlowDialogOpen] = useState(false)
  const [apiDialogOpen, setAPIDialogOpen] = useState(false)
  const [apiDialogProps, setAPIDialogProps] = useState({})
  const [viewMessagesDialogOpen, setViewMessagesDialogOpen] = useState(false)
  const [viewMessagesDialogProps, setViewMessagesDialogProps] = useState({})
  const [viewLeadsDialogOpen, setViewLeadsDialogOpen] = useState(false)
  const [viewLeadsDialogProps, setViewLeadsDialogProps] = useState({})
  const [upsertHistoryDialogOpen, setUpsertHistoryDialogOpen] = useState(false)
  const [upsertHistoryDialogProps, setUpsertHistoryDialogProps] = useState({})
  const [groupUser, setGroupUser] = useState([])
  const [chatflowConfigurationDialogOpen, setChatflowConfigurationDialogOpen] = useState(false)
  const [chatflowConfigurationDialogProps, setChatflowConfigurationDialogProps] = useState({})

  const [exportAsTemplateDialogOpen, setExportAsTemplateDialogOpen] = useState(false)
  const [exportAsTemplateDialogProps, setExportAsTemplateDialogProps] = useState({})
  const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
  const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

  const title = isAgentCanvas ? 'Agents' : 'Chatflow'

  const updateChatflowApi = useApi(chatflowsApi.updateChatflow)
  const canvas = useSelector((state) => state.canvas)

  const handleGetGroupUser = async () => {
    try {
      const groupUserResp = await userApi.getAllGroupUsers()
      if (groupUserResp.data) {
        setGroupUser(groupUserResp.data)
      }
    } catch (error) {
      console.error(error)
    }
  }

  const onSettingsItemClick = (setting) => {
    setSettingsOpen(false)

    if (setting === 'deleteChatflow') {
      handleDeleteFlow()
    } else if (setting === 'viewMessages') {
      setViewMessagesDialogProps({
        title: 'View Messages',
        chatflow: chatflow
      })
      setViewMessagesDialogOpen(true)
    } else if (setting === 'viewLeads') {
      setViewLeadsDialogProps({
        title: 'View Leads',
        chatflow: chatflow
      })
      setViewLeadsDialogOpen(true)
    } else if (setting === 'saveAsTemplate') {
      if (canvas.isDirty) {
        enqueueSnackbar({
          message: 'Please save the flow before exporting as template',
          options: {
            key: new Date().getTime() + Math.random(),
            variant: 'error',
            persist: true,
            action: (key) => (
              <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                <IconX />
              </Button>
            )
          }
        })
        return
      }
      setExportAsTemplateDialogProps({
        title: 'Export As Template',
        chatflow: chatflow
      })
      setExportAsTemplateDialogOpen(true)
    } else if (setting === 'viewUpsertHistory') {
      setUpsertHistoryDialogProps({
        title: 'View Upsert History',
        chatflow: chatflow
      })
      setUpsertHistoryDialogOpen(true)
    } else if (setting === 'chatflowConfiguration') {
      setChatflowConfigurationDialogProps({
        title: `${title} Configuration`,
        chatflow: chatflow
      })
      setChatflowConfigurationDialogOpen(true)
    } else if (setting === 'duplicateChatflow') {
      try {
        let flowData = chatflow.flowData
        const parsedFlowData = JSON.parse(flowData)
        flowData = JSON.stringify(parsedFlowData)
        localStorage.setItem('duplicatedFlowData', flowData)
        window.open(`${uiBaseURL}/${isAgentCanvas ? 'agentcanvas' : 'canvas'}`, '_blank')
      } catch (e) {
        console.error(e)
      }
    } else if (setting === 'exportChatflow') {
      try {
        const flowData = JSON.parse(chatflow.flowData)
        let dataStr = JSON.stringify(generateExportFlowData(flowData), null, 2)
        let dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)

        let exportFileDefaultName = `${chatflow.name} ${title}.json`

        let linkElement = document.createElement('a')
        linkElement.setAttribute('href', dataUri)
        linkElement.setAttribute('download', exportFileDefaultName)
        linkElement.click()
      } catch (e) {
        console.error(e)
      }
    }
  }

  const onUploadFile = (file) => {
    setSettingsOpen(false)
    handleLoadFlow(file)
  }

  const submitFlowName = () => {
    if (chatflow.id) {
      const updateBody = {
        name: flowNameRef.current.value
      }
      updateChatflowApi.request(chatflow.id, updateBody)
    }
  }

  const onAPIDialogClick = () => {
    // If file type is file, isFormDataRequired = true
    let isFormDataRequired = false
    try {
      const flowData = JSON.parse(chatflow.flowData)
      const nodes = flowData.nodes
      for (const node of nodes) {
        if (node.data.inputParams.find((param) => param.type === 'file')) {
          isFormDataRequired = true
          break
        }
      }
    } catch (e) {
      console.error(e)
    }

    // If sessionId memory, isSessionMemory = true
    let isSessionMemory = false
    try {
      const flowData = JSON.parse(chatflow.flowData)
      const nodes = flowData.nodes
      for (const node of nodes) {
        if (node.data.inputParams.find((param) => param.name === 'sessionId')) {
          isSessionMemory = true
          break
        }
      }
    } catch (e) {
      console.error(e)
    }

    setAPIDialogProps({
      title: 'Embed in website or use as API',
      chatflowid: chatflow.id,
      chatflowApiKeyId: chatflow.apikeyid,
      isFormDataRequired,
      isSessionMemory,
      isAgentCanvas
    })
    setAPIDialogOpen(true)
  }

  const onSaveChatflowClick = () => {
    if (chatflow.id) handleSaveFlow(flowName)
    else setFlowDialogOpen(true)
  }

  const onConfirmSaveName = (flowName) => {
    setFlowDialogOpen(false)
    handleSaveFlow(flowName)
  }

  const onSwitchChange = async (checked) => {
    if (!chatflow.id) {
      return enqueueSnackbar({
        message: 'Vui lòng lưu luồng trước khi thay đổi trạng thái công khai',
        options: {
          key: new Date().getTime() + Math.random(),
          variant: 'error',
          persist: true,
          action: (key) => (
            <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
              <IconX />
            </Button>
          )
        }
      })
    }
    setChatflowIsPublic(checked)
    try {
      const saveResp = await chatflowsApi.updateChatflow(chatflow.id, { isPublic: checked })
      if (saveResp.data) {
        enqueueSnackbar({
          message: 'Chatbot Configuration Saved',
          options: {
            key: new Date().getTime() + Math.random(),
            variant: 'success',
            action: (key) => (
              <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                <IconX />
              </Button>
            )
          }
        })
        dispatch({ type: SET_CHATFLOW, chatflow: saveResp.data })
      }
    } catch (error) {
      enqueueSnackbar({
        message: `Failed to save Chatbot Configuration: ${
          typeof error.response.data === 'object' ? error.response.data.message : error.response.data
        }`,
        options: {
          key: new Date().getTime() + Math.random(),
          variant: 'error',
          persist: true,
          action: (key) => (
            <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
              <IconX />
            </Button>
          )
        }
      })
      setChatflowIsPublic(!checked)
    }
  }

  const handleChangeGroupFlow = async (groupname) => {
    try {
      const saveResp = await chatflowsApi.updateChatflow(chatflow.id, { groupname })
      if (saveResp.data) {
        enqueueSnackbar({
          message: 'Chatbot Configuration Saved',
          options: {
            key: new Date().getTime() + Math.random(),
            variant: 'success',
            action: (key) => (
              <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                <IconX />
              </Button>
            )
          }
        })
        dispatch({ type: SET_CHATFLOW, chatflow: saveResp.data })
      }
    } catch (error) {
      enqueueSnackbar({
        message: `Failed to save Chatbot Configuration: ${
          typeof error.response.data === 'object' ? error.response.data.message : error.response.data
        }`,
        options: {
          key: new Date().getTime() + Math.random(),
          variant: 'error',
          persist: true,
          action: (key) => (
            <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
              <IconX />
            </Button>
          )
        }
      })
    }
  }

  useEffect(() => {
    if (updateChatflowApi.data) {
      setFlowName(updateChatflowApi.data.name)
      dispatch({ type: SET_CHATFLOW, chatflow: updateChatflowApi.data })
    }
    setEditingFlowName(false)

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateChatflowApi.data])

  useEffect(() => {
    if (chatflow) {
      if (
        user?.role === 'MASTER_ADMIN' ||
        (user?.role === 'USER' && chatflow?.userId === user?.id) ||
        (user?.role === 'ADMIN' && (user?.groupname === chatflow?.user?.groupname || user?.groupname === chatflow?.groupname)) ||
        pathname === '/canvas' ||
        pathname === '/agentcanvas'
      ) {
        setIsAdminPage(true)
      } else {
        setIsAdminPage(false)
      }
    }
  }, [user, chatflow])

  useEffect(() => {
    if (chatflow?.id) {
      setChatflowIsPublic(chatflow?.isPublic)
      setFlowName(chatflow?.name)
      // if configuration dialog is open, update its data
      if (chatflowConfigurationDialogOpen) {
        setChatflowConfigurationDialogProps({
          title: `${title} Configuration`,
          chatflow
        })
      }
    }
  }, [chatflow, chatflowConfigurationDialogOpen, title])

  useEffect(() => {
    if (user) {
      handleGetGroupUser()
    }
  }, [user])

  return (
    <>
      <Stack flexDirection='row' justifyContent='space-between' sx={{ width: '100%' }}>
        <Stack className='flex items-center gap-3' flexDirection='row' sx={{ width: '100%' }}>
          <div className='flex items-center'>
            <Box>
              <ButtonBase title='Back' sx={{ borderRadius: '50%' }}>
                <Avatar
                  variant='rounded'
                  sx={{
                    ...theme.typography.commonAvatar,
                    ...theme.typography.mediumAvatar,
                    transition: 'all .2s ease-in-out',
                    background: theme.palette.secondary.light,
                    color: theme.palette.secondary.dark,
                    '&:hover': {
                      background: theme.palette.secondary.dark,
                      color: theme.palette.secondary.light
                    }
                  }}
                  color='inherit'
                  onClick={() => (isAgentCanvas ? navigate('/agentflows') : navigate('/', { replace: true }))}
                >
                  <IconChevronLeft stroke={1.5} size='1.3rem' />
                </Avatar>
              </ButtonBase>
            </Box>
            <Box>
              {!isEditingFlowName ? (
                <Stack flexDirection='row'>
                  <Typography
                    sx={{
                      fontSize: '1.5rem',
                      fontWeight: 600,
                      ml: 2,
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {canvas.isDirty && <strong style={{ color: theme.palette.orange.main }}>*</strong>} {flowName}
                  </Typography>
                  {isAdminPage && chatflow?.id && (
                    <ButtonBase title='Edit Name' sx={{ borderRadius: '50%' }}>
                      <Avatar
                        variant='rounded'
                        sx={{
                          ...theme.typography.commonAvatar,
                          ...theme.typography.mediumAvatar,
                          transition: 'all .2s ease-in-out',
                          ml: 1,
                          background: theme.palette.secondary.light,
                          color: theme.palette.secondary.dark,
                          '&:hover': {
                            background: theme.palette.secondary.dark,
                            color: theme.palette.secondary.light
                          }
                        }}
                        color='inherit'
                        onClick={() => setEditingFlowName(true)}
                      >
                        <IconPencil stroke={1.5} size='1.3rem' />
                      </Avatar>
                    </ButtonBase>
                  )}
                </Stack>
              ) : (
                <Stack flexDirection='row' sx={{ width: '100%' }}>
                  <TextField
                    //eslint-disable-next-line jsx-a11y/no-autofocus
                    autoFocus
                    size='small'
                    inputRef={flowNameRef}
                    sx={{
                      width: '100%',
                      ml: 2
                    }}
                    defaultValue={flowName}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        submitFlowName()
                      } else if (e.key === 'Escape') {
                        setEditingFlowName(false)
                      }
                    }}
                  />
                  <ButtonBase title='Save Name' sx={{ borderRadius: '50%' }}>
                    <Avatar
                      variant='rounded'
                      sx={{
                        ...theme.typography.commonAvatar,
                        ...theme.typography.mediumAvatar,
                        transition: 'all .2s ease-in-out',
                        background: theme.palette.success.light,
                        color: theme.palette.success.dark,
                        ml: 1,
                        '&:hover': {
                          background: theme.palette.success.dark,
                          color: theme.palette.success.light
                        }
                      }}
                      color='inherit'
                      onClick={submitFlowName}
                    >
                      <IconCheck stroke={1.5} size='1.3rem' />
                    </Avatar>
                  </ButtonBase>
                  <ButtonBase title='Cancel' sx={{ borderRadius: '50%' }}>
                    <Avatar
                      variant='rounded'
                      sx={{
                        ...theme.typography.commonAvatar,
                        ...theme.typography.mediumAvatar,
                        transition: 'all .2s ease-in-out',
                        background: theme.palette.error.light,
                        color: theme.palette.error.dark,
                        ml: 1,
                        '&:hover': {
                          background: theme.palette.error.dark,
                          color: theme.palette.error.light
                        }
                      }}
                      color='inherit'
                      onClick={() => setEditingFlowName(false)}
                    >
                      <IconX stroke={1.5} size='1.3rem' />
                    </Avatar>
                  </ButtonBase>
                </Stack>
              )}
            </Box>
          </div>
          {chatflow?.user?.username && (
            <div className='flex items-center'>
              <Typography
                sx={{
                  fontSize: '1rem',
                  fontWeight: 500,
                  ml: 2,
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap'
                }}
              >
                Người tạo: {chatflow.user.username}
              </Typography>
              {isAdmin && (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Switch
                    checked={isPublicChatflow}
                    onChange={(event) => {
                      onSwitchChange(event.target.checked)
                    }}
                  />
                  <Typography>Make Public</Typography>
                  <TooltipWithParser
                    style={{ marginLeft: 10 }}
                    title={'Making public will allow anyone to access the chatbot without username & password'}
                  />
                </div>
              )}
            </div>
          )}
          {(chatflow?.groupname || chatflow?.user?.groupname) && (
            <div className='flex flex-row gap-1'>
              <Typography
                sx={{
                  fontSize: '1rem',
                  fontWeight: 500,
                  ml: 2,
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  alignSelf: 'center'
                }}
              >
                Group:
              </Typography>
              <TextField
                select
                value={chatflow?.groupname || chatflow?.user?.groupname}
                onChange={(e) => {
                  const selectedGroup = e.target.value
                  handleChangeGroupFlow(selectedGroup)
                }}
                variant='standard'
                size='small'
                sx={{
                  ml: 1,
                  '& .MuiInputBase-input': {
                    fontSize: '1rem',
                    fontWeight: 500,
                    paddingBottom: 0,
                    alignContent: 'center'
                  },
                  ...(!isMasterAdmin && {
                    '& .MuiSelect-icon': {
                      display: 'none'
                    },
                    '& .MuiInput-underline:before, & .MuiInput-underline:after': {
                      display: 'none' // Removes the underline
                    }
                  })
                }}
                disabled={!isMasterAdmin}
              >
                {groupUser.map((group) => (
                  <MenuItem key={group.id} value={group.groupname}>
                    {group.groupname}
                  </MenuItem>
                ))}
              </TextField>
            </div>
          )}
        </Stack>
        <Box className='w-[150px] min-w-[150px] text-end'>
          {isAdminPage && chatflow?.id && (
            <ButtonBase title='API Endpoint' sx={{ borderRadius: '50%', mr: 2 }}>
              <Avatar
                variant='rounded'
                sx={{
                  ...theme.typography.commonAvatar,
                  ...theme.typography.mediumAvatar,
                  transition: 'all .2s ease-in-out',
                  background: theme.palette.canvasHeader.deployLight,
                  color: theme.palette.canvasHeader.deployDark,
                  '&:hover': {
                    background: theme.palette.canvasHeader.deployDark,
                    color: theme.palette.canvasHeader.deployLight
                  }
                }}
                color='inherit'
                onClick={onAPIDialogClick}
              >
                <IconCode stroke={1.5} size='1.3rem' />
              </Avatar>
            </ButtonBase>
          )}
          {isAdminPage && (
            <ButtonBase title={`Save ${title}`} sx={{ borderRadius: '50%', mr: 2 }}>
              <Avatar
                variant='rounded'
                sx={{
                  ...theme.typography.commonAvatar,
                  ...theme.typography.mediumAvatar,
                  transition: 'all .2s ease-in-out',
                  background: theme.palette.canvasHeader.saveLight,
                  color: theme.palette.canvasHeader.saveDark,
                  '&:hover': {
                    background: theme.palette.canvasHeader.saveDark,
                    color: theme.palette.canvasHeader.saveLight
                  }
                }}
                color='inherit'
                onClick={onSaveChatflowClick}
              >
                <IconDeviceFloppy stroke={1.5} size='1.3rem' />
              </Avatar>
            </ButtonBase>
          )}
          <ButtonBase ref={settingsRef} title='Settings' sx={{ borderRadius: '50%' }}>
            <Avatar
              variant='rounded'
              sx={{
                ...theme.typography.commonAvatar,
                ...theme.typography.mediumAvatar,
                transition: 'all .2s ease-in-out',
                background: theme.palette.canvasHeader.settingsLight,
                color: theme.palette.canvasHeader.settingsDark,
                '&:hover': {
                  background: theme.palette.canvasHeader.settingsDark,
                  color: theme.palette.canvasHeader.settingsLight
                }
              }}
              onClick={() => setSettingsOpen(!isSettingsOpen)}
            >
              <IconSettings stroke={1.5} size='1.3rem' />
            </Avatar>
          </ButtonBase>
        </Box>
      </Stack>
      <Settings
        chatflow={chatflow}
        isSettingsOpen={isSettingsOpen}
        anchorEl={settingsRef.current}
        onClose={() => setSettingsOpen(false)}
        onSettingsItemClick={onSettingsItemClick}
        onUploadFile={onUploadFile}
        isAgentCanvas={isAgentCanvas}
      />
      <SaveChatflowDialog
        show={flowDialogOpen}
        dialogProps={{
          title: `Save New ${title}`,
          confirmButtonName: 'Save',
          cancelButtonName: 'Cancel'
        }}
        onCancel={() => setFlowDialogOpen(false)}
        onConfirm={onConfirmSaveName}
      />
      {apiDialogOpen && <APICodeDialog show={apiDialogOpen} dialogProps={apiDialogProps} onCancel={() => setAPIDialogOpen(false)} />}
      <ViewMessagesDialog
        show={viewMessagesDialogOpen}
        dialogProps={viewMessagesDialogProps}
        onCancel={() => setViewMessagesDialogOpen(false)}
      />
      <ViewLeadsDialog show={viewLeadsDialogOpen} dialogProps={viewLeadsDialogProps} onCancel={() => setViewLeadsDialogOpen(false)} />
      {exportAsTemplateDialogOpen && (
        <ExportAsTemplateDialog
          show={exportAsTemplateDialogOpen}
          dialogProps={exportAsTemplateDialogProps}
          onCancel={() => setExportAsTemplateDialogOpen(false)}
        />
      )}
      <UpsertHistoryDialog
        show={upsertHistoryDialogOpen}
        dialogProps={upsertHistoryDialogProps}
        onCancel={() => setUpsertHistoryDialogOpen(false)}
      />
      <ChatflowConfigurationDialog
        key='chatflowConfiguration'
        show={chatflowConfigurationDialogOpen}
        dialogProps={chatflowConfigurationDialogProps}
        onCancel={() => setChatflowConfigurationDialogOpen(false)}
      />
    </>
  )
}

CanvasHeader.propTypes = {
  chatflow: PropTypes.object,
  handleSaveFlow: PropTypes.func,
  handleDeleteFlow: PropTypes.func,
  handleLoadFlow: PropTypes.func,
  isAgentCanvas: PropTypes.bool
}

export default CanvasHeader
