// pages/showcase/index.jsx — FULL FILE (opens agent share URL in both views)

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'

// material-ui
import {
  Chip,
  Box,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Link as MuiLink,
  Menu,
  Checkbox,
  Button
} from '@mui/material'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import { useTheme } from '@mui/material/styles'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import ShowcaseItemCard from '@/ui-component/cards/ShowcaseItemCard'
import { gridSpacing } from '@/store/constant'
import AgentsEmptySVG from '@/assets/images/agents_empty.svg'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import ErrorBoundary from '@/ErrorBoundary'
import { PermissionMenuItem, StyledPermissionButton } from '@/ui-component/button/RBACButtons'
import TablePagination, { DEFAULT_ITEMS_PER_PAGE } from '@/ui-component/pagination/TablePagination'

// API
import chatflowsApi from '@/api/chatflows'

// Hooks
import useApi from '@/hooks/useApi'

// const
import { baseURL, AGENTFLOW_ICONS, uiBaseURL } from '@/store/constant'
import { useError } from '@/store/context/ErrorContext'

// icons
import { IconPlus, IconLayoutGrid, IconList } from '@tabler/icons-react'

// modal
import ShowcaseCreateDialog from '@/ui-component/dialog/ShowcaseCreateDialog'

/* ========= Local menu for Showcase LIST view only ========= */
function ShowcaseOptionsMenu({ row }) {
  const [anchorEl, setAnchorEl] = useState(null)
  const open = Boolean(anchorEl)
  const handleOpen = (e) => setAnchorEl(e.currentTarget)
  const handleClose = () => setAnchorEl(null)

  const updateChatflowApi = useApi(chatflowsApi.updateChatflow)

  let enabled = false
  try {
    const parsed = JSON.parse(row?.flowData || '{}')
    enabled = !!parsed?.metadata?.showInShowcase
  } catch {
    enabled = false
  }

  const handleToggleDisable = async (e) => {
    e.stopPropagation()
    try {
      const current = JSON.parse(row?.flowData || '{}')
      const next = {
        ...current,
        metadata: { ...(current.metadata || {}), showInShowcase: !enabled }
      }
      await updateChatflowApi.request(row.id, { flowData: JSON.stringify(next) })
      // optimistic update
      row.flowData = JSON.stringify(next)
      // notify Showcase to refresh (so the row disappears when disabled)
      window.dispatchEvent(new CustomEvent('showcase:toggle', { detail: { id: row.id, enabled: !enabled } }))
      handleClose()
    } catch (err) {
      console.error(err)
      handleClose()
    }
  }

  return (
    <>
      <Button
        size="small"
        variant="text"
        onClick={handleOpen}
        endIcon={<KeyboardArrowDownIcon />}
        sx={{ borderRadius: 2, px: 1.25, py: 0.5 }}
      >
        Options
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {/* Only one item inside dropdown */}
        <PermissionMenuItem
          permissionId={'agentflows:update'}
          onClick={handleToggleDisable}
          dense
          disableRipple
        >
          <Checkbox
            size="small"
            checked={enabled}             // checked = currently visible in Showcase
            onClick={(e) => e.stopPropagation()}
            sx={{ p: 0, mr: 1.25 }}
          />
          Disable from Showcase
        </PermissionMenuItem>
      </Menu>
    </>
  )
}
/* ========================================================== */

const Showcase = () => {
  const navigate = useNavigate()
  const theme = useTheme()
  const customization = useSelector((state) => state.customization)

  const [isLoading, setLoading] = useState(true)
  const [images, setImages] = useState({})
  const [icons, setIcons] = useState({})
  const [search, setSearch] = useState('')

  const { error, setError } = useError()
  const getAllAgentflows = useApi(chatflowsApi.getAllAgentflows)
  const createAgentflowApi = useApi(chatflowsApi.createNewChatflow)

  const [view, setView] = useState(localStorage.getItem('flowDisplayStyle') || 'card')
  const [agentflowVersion, setAgentflowVersion] = useState(localStorage.getItem('agentFlowVersion') || 'v2')

  const [openCreate, setOpenCreate] = useState(false)
  const [shareUrls, setShareUrls] = useState({})

  const [currentPage, setCurrentPage] = useState(1)
  const [pageLimit, setPageLimit] = useState(DEFAULT_ITEMS_PER_PAGE)
  const [total, setTotal] = useState(0)

  const onChange = (page, pageLimit) => {
    setCurrentPage(page)
    setPageLimit(pageLimit)
    refresh(page, pageLimit, agentflowVersion)
  }

  const refresh = (page, limit, nextView) => {
    const params = { page: page || currentPage, limit: limit || pageLimit }
    getAllAgentflows.request(nextView === 'v2' ? 'AGENTFLOW' : 'MULTIAGENT', params)
  }

  const handleChange = (_e, nextView) => {
    if (nextView === null) return
    localStorage.setItem('flowDisplayStyle', nextView)
    setView(nextView)
  }

  const handleVersionChange = (_e, nextView) => {
    if (nextView === null) return
    localStorage.setItem('agentFlowVersion', nextView)
    setAgentflowVersion(nextView)
    refresh(1, pageLimit, nextView)
  }

  const onSearchChange = (e) => setSearch(e.target.value)

  function filterFlows(data) {
    return (
      data.name.toLowerCase().includes(search.toLowerCase()) ||
      (data.category && data.category.toLowerCase().includes(search.toLowerCase())) ||
      data.id.toLowerCase().includes(search.toLowerCase())
    )
  }

  const addNew = () => setOpenCreate(true)

  // Open the agent URL in a new tab for a given row
  const getShareUrl = (rowOrId) => {
    const id = typeof rowOrId === 'string' ? rowOrId : rowOrId?.id
    return shareUrls[id] || `${uiBaseURL}/chatbot/${id}`
  }
  const openShareUrl = (row) => {
    const url = getShareUrl(row)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const goToCanvas = (selectedAgentflow) => {
    if (selectedAgentflow.type === 'AGENTFLOW') navigate(`/v2/agentcanvas/${selectedAgentflow.id}`)
    else navigate(`/agentcanvas/${selectedAgentflow.id}`)
  }

  const createAgentflow = async ({ name, category, description, url }) => {
    try {
      const flowData = { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 }, metadata: { shareUrl: url || '' } }
      const payload = { name, category, description, type: 'AGENTFLOW', flowData: JSON.stringify(flowData) }
      await createAgentflowApi.request(payload)
      setOpenCreate(false)
      refresh(1, pageLimit, agentflowVersion)
    } catch (e) {
      console.error(e)
      setOpenCreate(false)
    }
  }

  useEffect(() => {
    refresh(currentPage, pageLimit, agentflowVersion)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (getAllAgentflows.error) setError(getAllAgentflows.error)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getAllAgentflows.error])

  useEffect(() => setLoading(getAllAgentflows.loading), [getAllAgentflows.loading])

  useEffect(() => {
    if (!getAllAgentflows.data) return
    try {
      const agentflows = getAllAgentflows.data?.data
      setTotal(getAllAgentflows.data?.total)

      const nextImages = {}
      const nextIcons = {}
      const nextShareUrls = {}

      for (let i = 0; i < agentflows.length; i += 1) {
        const flowDataStr = agentflows[i].flowData
        const flowData = JSON.parse(flowDataStr || '{}')
        const nodes = flowData.nodes || []

        if (flowData?.metadata?.shareUrl) nextShareUrls[agentflows[i].id] = flowData.metadata.shareUrl

        nextImages[agentflows[i].id] = []
        nextIcons[agentflows[i].id] = []

        for (let j = 0; j < nodes.length; j += 1) {
          if (nodes[j].data.name === 'stickyNote' || nodes[j].data.name === 'stickyNoteAgentflow') continue

          const foundIcon = AGENTFLOW_ICONS.find((icon) => icon.name === nodes[j].data.name)
          if (foundIcon) {
            nextIcons[agentflows[i].id].push(foundIcon)
          } else {
            const imageSrc = `${baseURL}/api/v1/node-icon/${nodes[j].data.name}`
            if (!nextImages[agentflows[i].id].some((img) => img.imageSrc === imageSrc)) {
              nextImages[agentflows[i].id].push({ imageSrc, label: nodes[j].data.label })
            }
          }
        }
      }

      setImages(nextImages)
      setIcons(nextIcons)
      setShareUrls(nextShareUrls)
    } catch (e) {
      console.error(e)
    }
  }, [getAllAgentflows.data])

  // Only show items explicitly enabled for Showcase
  const showcaseEnabledData =
    getAllAgentflows.data?.data?.filter((row) => {
      try {
        const flowData = JSON.parse(row.flowData || '{}')
        return flowData?.metadata?.showInShowcase === true
      } catch {
        return false
      }
    }) || []

  // Listen for the toggle event and refresh immediately
  useEffect(() => {
    const onToggle = () => {
      const type = agentflowVersion === 'v2' ? 'AGENTFLOW' : 'MULTIAGENT'
      getAllAgentflows.request(type, { page: 1, limit: pageLimit })
    }
    window.addEventListener('showcase:toggle', onToggle)
    return () => window.removeEventListener('showcase:toggle', onToggle)
  }, [agentflowVersion, pageLimit, getAllAgentflows])

  const groupedAgentflows = showcaseEnabledData
    ?.filter(filterFlows)
    .reduce((acc, item) => {
      const tag = item.tags || 'Untagged'
      if (!acc[tag]) acc[tag] = []
      acc[tag].push(item)
      return acc
    }, {})

  return (
    <MainCard>
      {error ? (
        <ErrorBoundary error={error} />
      ) : (
        <Stack flexDirection="column" sx={{ gap: 3 }}>
          <ViewHeader
            onSearchChange={onSearchChange}
            search={true}
            searchPlaceholder="Search Name or Tag"
            title="Showcase"
            description="Coworkers crafted for real lives, real needs"
          >
            <ToggleButtonGroup sx={{ borderRadius: 2, maxHeight: 40 }} value={view} disabled={total === 0} color="primary" exclusive onChange={handleChange}>
              <ToggleButton
                sx={{ borderColor: theme.palette.grey[900] + 25, borderRadius: 2, color: customization.isDarkMode ? 'white' : 'inherit' }}
                variant="contained"
                value="card"
                title="Card View"
              >
                <IconLayoutGrid />
              </ToggleButton>
              <ToggleButton
                sx={{ borderColor: theme.palette.grey[900] + 25, borderRadius: 2, color: customization.isDarkMode ? 'white' : 'inherit' }}
                variant="contained"
                value="list"
                title="List View"
              >
                <IconList />
              </ToggleButton>
            </ToggleButtonGroup>

            <StyledPermissionButton permissionId={'agentflows:create'} variant="contained" onClick={addNew} startIcon={<IconPlus />} sx={{ borderRadius: 2, height: 40 }}>
              Add New
            </StyledPermissionButton>
          </ViewHeader>

          {!isLoading && showcaseEnabledData.length > 0 && (
            <>
              {/* CARD VIEW: entire card opens the agent share URL */}
              {!view || view === 'card' ? (
                <Stack spacing={4}>
                  {groupedAgentflows &&
                    Object.entries(groupedAgentflows).map(([tag, items]) => (
                      <Box key={tag}>
                        <Box
                          sx={{
                            mb: 2,
                            px: 2.5,
                            py: 0.8,
                            display: 'inline-block',
                            borderRadius: '20px',
                            backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[200],
                            color: theme.palette.text.primary,
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            boxShadow: theme.shadows[1]
                          }}
                        >
                          {tag}
                        </Box>

                        <Box display="grid" gridTemplateColumns="repeat(3, 1fr)" gap={gridSpacing}>
                          {items.map((data) => {
                            const url = getShareUrl(data.id)
                            return (
                              <Box
                                key={data.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    window.open(url, '_blank', 'noopener,noreferrer')
                                  }
                                }}
                                sx={{ cursor: 'pointer' }}
                              >
                                <ShowcaseItemCard
                                  data={data}
                                  images={images[data.id]}
                                  icons={icons[data.id]}
                                  shareUrl={shareUrls[data.id]}
                                />
                              </Box>
                            )
                          })}
                        </Box>
                      </Box>
                    ))}
                </Stack>
              ) : (
                /* LIST VIEW: name opens share URL; Options dropdown present */
                <Box sx={{
                  borderRadius: 2,
                  overflow: 'hidden',
                  border: `1px solid ${theme.palette.divider}`,
                  backgroundColor:
                    theme.palette.mode === 'dark'
                      ? theme.palette.background.default
                      : theme.palette.background.paper
                }}>
                  <Table size="medium"
                    sx={{
                      '& thead th': {
                        backgroundColor:
                          theme.palette.mode === 'dark'
                            ? 'rgba(255,255,255,0.05)'
                            : 'rgba(0,0,0,0.03)',
                        color: theme.palette.text.primary,
                        fontWeight: 600
                      },
                      '& tbody tr': {
                        '&:hover': {
                          backgroundColor: theme.palette.action.hover
                        }
                      },
                      '& td, & th': {
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        color: theme.palette.text.primary
                      }
                    }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Last Modified Date</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {showcaseEnabledData.map((row) => {
                        const urlToOpen = getShareUrl(row.id)
                        return (
                          <TableRow key={row.id} hover>
                            <TableCell>
                              <MuiLink
                                component="button"
                                type="button"
                                underline="hover"
                                sx={{ fontWeight: 500 }}
                                onClick={() => window.open(urlToOpen, '_blank', 'noopener,noreferrer')}
                              >
                                {row.name}
                              </MuiLink>
                            </TableCell>
                            <TableCell>{row.updatedDate || row.updated || row.createdDate || '—'}</TableCell>
                            <TableCell>
                              <ShowcaseOptionsMenu row={row} />
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </Box>
              )}

              <TablePagination currentPage={currentPage} limit={pageLimit} total={total} onChange={onChange} />
            </>
          )}

          {!isLoading && showcaseEnabledData.length === 0 && (
            <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection="column">
              <Box sx={{ p: 2, height: 'auto' }}>
                <img style={{ objectFit: 'cover', height: '12vh', width: 'auto' }} src={AgentsEmptySVG} alt="AgentsEmptySVG" />
              </Box>
              <div>No Agents in Showcase Yet</div>
            </Stack>
          )}
        </Stack>
      )}
      <ConfirmDialog />

      <ShowcaseCreateDialog open={openCreate} onClose={() => setOpenCreate(false)} onSave={createAgentflow} />
    </MainCard>
  )
}

export default Showcase
