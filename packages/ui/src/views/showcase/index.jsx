// pages/showcase/index.jsx — Showcase-only (not saved in Agentflows), Update Tags option, no Tags in Add

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
  MenuItem,
  Checkbox,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
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

/* ---------------- Normalizer: prefer /chatbot/<uuid>, fallback to /public-agent/<uuid> ---------------- */
const normalizeToPublicUrl = (url, id) => {
  const cacheBust = `v=${Date.now()}`
  const withQs = (href) => (href.includes('?') ? `${href}&${cacheBust}` : `${href}?${cacheBust}`)
  const fallbackById = () => withQs(`${uiBaseURL}/chatbot/${id}`)

  if (!url) return fallbackById()

  try {
    // Full URLs
    if (/^https?:\/\//i.test(url)) {
      const u = new URL(url)
      const m = u.pathname.match(/\/(chatbot|public-agent|agent)\/([0-9a-f-]{36})/i)
      if (m && m[1] === 'chatbot') return withQs(`${u.origin}/chatbot/${m[2]}`)
      if (m && m[1] !== 'chatbot') return withQs(`${u.origin}/public-agent/${m[2]}`)
      return withQs(u.href)
    }
    // Relative paths
    const m2 = url.match(/\/(chatbot|public-agent|agent)\/([0-9a-f-]{36})/i)
    if (m2 && m2[1] === 'chatbot') return withQs(`${uiBaseURL}/chatbot/${m2[2]}`)
    if (m2 && m2[1] !== 'chatbot') return withQs(`${uiBaseURL}/public-agent/${m2[2]}`)
    return fallbackById()
  } catch {
    return fallbackById()
  }
}
// compatibility alias (some places call this)
const normalizeToChatbotUrl = normalizeToPublicUrl

/* ===== Rename Dialog (Showcase) ===== */
function ShowcaseRenameDialog({ open, row, onClose, onSave }) {
  const [name, setName] = useState(row?.name || '')
  const [description, setDescription] = useState(row?.description || '')
  const [url, setUrl] = useState(() => {
    try {
      const fd = JSON.parse(row?.flowData || '{}')
      return fd?.metadata?.shareUrl || ''
    } catch {
      return ''
    }
  })

  useEffect(() => {
    setName(row?.name || '')
    setDescription(row?.description || '')
    try {
      const fd = JSON.parse(row?.flowData || '{}')
      setUrl(fd?.metadata?.shareUrl || '')
    } catch {
      setUrl('')
    }
  }, [row, open])

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Rename Agent</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Agent name" value={name} onChange={(e) => setName(e.target.value)} fullWidth autoFocus />
          <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} fullWidth multiline minRows={2} />
          <TextField label="Agent URL" value={url} onChange={(e) => setUrl(e.target.value)} fullWidth placeholder="https://…" />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="text" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="contained" onClick={() => onSave({ name, description, url })}>
          Rename
        </Button>
      </DialogActions>
    </Dialog>
  )
}

/* ===== Add Dialog (Showcase) — NO Tags here per request ===== */
function ShowcaseAddDialog({ open, onClose, onSave }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [url, setUrl] = useState('')

  useEffect(() => {
    if (!open) {
      setName('')
      setDescription('')
      setCategory('')
      setUrl('')
    }
  }, [open])

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add to Showcase</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Agent name" value={name} onChange={(e) => setName(e.target.value)} fullWidth autoFocus />
          <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} fullWidth multiline minRows={2} />
          <TextField label="Category" value={category} onChange={(e) => setCategory(e.target.value)} fullWidth />
          <TextField label="Agent URL" value={url} onChange={(e) => setUrl(e.target.value)} fullWidth placeholder="https://…" />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="text" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() =>
            onSave({
              name: name?.trim(),
              description: description?.trim(),
              category: category?.trim(),
              url: url?.trim()
            })
          }
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  )
}

/* ===== Update Tags Dialog ===== */
function ShowcaseUpdateTagsDialog({ open, initialTags, onClose, onSave }) {
  const [tags, setTags] = useState(initialTags || '')
  useEffect(() => setTags(initialTags || ''), [initialTags, open])

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Update Tags</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Tags (comma separated)"
          fullWidth
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button variant="text" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="contained" onClick={() => onSave(tags)}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  )
}

/* ========= Options menu (list view) ========= */
function ShowcaseOptionsMenu({ row }) {
  const [anchorEl, setAnchorEl] = useState(null)
  const [openRename, setOpenRename] = useState(false)
  const [openTags, setOpenTags] = useState(false)
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
      const next = { ...current, metadata: { ...(current.metadata || {}), showInShowcase: !enabled } }
      await updateChatflowApi.request(row.id, { flowData: JSON.stringify(next) })
      row.flowData = JSON.stringify(next)
      window.dispatchEvent(new CustomEvent('showcase:toggle', { detail: { id: row.id, enabled: !enabled } }))
      handleClose()
    } catch (err) {
      console.error(err)
      handleClose()
    }
  }

  const openRenameDialog = (e) => {
    e.stopPropagation()
    setOpenRename(true)
    handleClose()
  }
  const openTagsDialog = (e) => {
    e.stopPropagation()
    setOpenTags(true)
    handleClose()
  }

  const handleSaveRename = async ({ name, description, url }) => {
    try {
      const current = JSON.parse(row?.flowData || '{}')
      const normalized = normalizeToChatbotUrl(url, row.id)
      const next = { ...current, metadata: { ...(current.metadata || {}), shareUrl: normalized } }
      await updateChatflowApi.request(row.id, { name, description, flowData: JSON.stringify(next) })
      row.name = name
      row.description = description
      row.flowData = JSON.stringify(next)
      window.dispatchEvent(new CustomEvent('showcase:renamed', { detail: { id: row.id } }))
    } catch (e) {
      console.error(e)
    } finally {
      setOpenRename(false)
    }
  }

  const handleSaveTags = async (tags) => {
    try {
      await updateChatflowApi.request(row.id, { tags })
      row.tags = tags
      window.dispatchEvent(new CustomEvent('showcase:tags', { detail: { id: row.id } }))
    } catch (e) {
      console.error(e)
    } finally {
      setOpenTags(false)
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
        <MenuItem onClick={openRenameDialog} dense disableRipple>
          Rename
        </MenuItem>
        <MenuItem onClick={openTagsDialog} dense disableRipple>
          Update Tags
        </MenuItem>
        <MenuItem onClick={handleToggleDisable} dense disableRipple>
          <Checkbox size="small" checked={enabled} onClick={(e) => e.stopPropagation()} sx={{ p: 0, mr: 1.25 }} />
          Disable from Showcase
        </MenuItem>
      </Menu>

      <ShowcaseRenameDialog open={openRename} row={row} onClose={() => setOpenRename(false)} onSave={handleSaveRename} />
      <ShowcaseUpdateTagsDialog open={openTags} initialTags={row?.tags || ''} onClose={() => setOpenTags(false)} onSave={handleSaveTags} />
    </>
  )
}

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

  const [openCreate, setOpenCreate] = useState(false)
  const [shareUrls, setShareUrls] = useState({})

  const [currentPage, setCurrentPage] = useState(1)
  const [pageLimit, setPageLimit] = useState(DEFAULT_ITEMS_PER_PAGE)
  const [total, setTotal] = useState(0)

  const onChange = (page, pageLimit) => {
    setCurrentPage(page)
    setPageLimit(pageLimit)
    refresh(page, pageLimit)
  }

  // IMPORTANT: Showcase-only type so these do NOT appear in Agentflows
  const refresh = (page, limit) => {
    const params = { page: page || currentPage, limit: limit || pageLimit }
    getAllAgentflows.request('SHOWCASE', params)
  }

  const handleChange = (_e, nextView) => {
    if (nextView === null) return
    localStorage.setItem('flowDisplayStyle', nextView)
    setView(nextView)
  }

  const onSearchChange = (e) => setSearch(e.target.value)

  // ====== SEARCH: name + id + category + tags (same for card & list view) ======
  function filterFlows(data) {
    const query = (search || '').toLowerCase()
    if (!query) return true

    const inName = data.name?.toLowerCase().includes(query)
    const inCategory = data.category?.toLowerCase().includes(query)
    const inId = data.id?.toLowerCase().includes(query)

    // Normalize tags (string or array) into one searchable string
    let tagsString = ''
    if (Array.isArray(data.tags)) {
      tagsString = data.tags.join(' ')
    } else if (typeof data.tags === 'string') {
      tagsString = data.tags
    }
    const inTags = tagsString.toLowerCase().includes(query)

    return inName || inCategory || inId || inTags
  }

  const addNew = () => setOpenCreate(true)

  // Always return a proper /chatbot URL with a cache-buster
  const getShareUrl = (rowOrId) => {
    const id = typeof rowOrId === 'string' ? rowOrId : rowOrId?.id
    const fromMeta = shareUrls[id]
    return normalizeToChatbotUrl(fromMeta, id)
  }

  const goToCanvas = (selectedAgentflow) => {
    navigate(`/v2/agentcanvas/${selectedAgentflow.id}`)
  }

  // CREATE: Save as SHOWCASE type (won’t appear in Agentflows) — NO tags here
  const createAgentflow = async ({ name, category, description, url }) => {
    try {
      const flowData = {
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
        metadata: {
          shareUrl: normalizeToChatbotUrl(url, 'TEMP'),
          showInShowcase: true
        }
      }

      const payload = {
        name,
        category: category || '',
        description: description || '',
        type: 'SHOWCASE',
        tags: '',
        flowData: JSON.stringify(flowData)
      }

      await createAgentflowApi.request(payload)
      setOpenCreate(false)
      refresh(1, pageLimit)
    } catch (e) {
      console.error(e)
      setOpenCreate(false)
    }
  }

  useEffect(() => {
    refresh(currentPage, pageLimit)
  }, [])
  useEffect(() => {
    if (getAllAgentflows.error) setError(getAllAgentflows.error)
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
        const flag = flowData?.metadata?.showInShowcase

        // For dedicated SHOWCASE items, keep them visible unless explicitly turned off
        if (row.type === 'SHOWCASE') {
          return !(
            flag === false ||
            flag === 'false' ||
            flag === 0 ||
            flag === '0'
          )
        }

        // For other types, treat various "true" forms as enabled
        return (
          flag === true ||
          flag === 'true' ||
          flag === 1 ||
          flag === '1'
        )
      } catch {
        return false
      }
    }) || []

  // Apply the same filter for both views (like Agentflows FlowListTable)
  const filteredShowcaseData = showcaseEnabledData.filter(filterFlows)

  // Reset to first page whenever search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [search])

  const paginationTotal = filteredShowcaseData.length || total

  // Refresh on toggle / rename / tags update
  useEffect(() => {
    const onAny = () => getAllAgentflows.request('SHOWCASE', { page: 1, limit: pageLimit })
    window.addEventListener('showcase:toggle', onAny)
    window.addEventListener('showcase:renamed', onAny)
    window.addEventListener('showcase:tags', onAny)
    return () => {
      window.removeEventListener('showcase:toggle', onAny)
      window.removeEventListener('showcase:renamed', onAny)
      window.removeEventListener('showcase:tags', onAny)
    }
  }, [pageLimit, getAllAgentflows])

  // Group by category for card view
  const groupedAgentflows = filteredShowcaseData?.reduce((acc, item) => {
    const category = item.category || 'Uncategorized'
    if (!acc[category]) acc[category] = []
    acc[category].push(item)
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
            search
            searchPlaceholder="Search Name or Tag"
            title="Showcase"
            description="Coworkers crafted for real lives, real needs"
          >
            <ToggleButtonGroup
              sx={{ borderRadius: 2, maxHeight: 40 }}
              value={view}
              disabled={paginationTotal === 0}
              color="primary"
              exclusive
              onChange={handleChange}
            >
              <ToggleButton sx={{ borderRadius: 2 }} variant="contained" value="card" title="Card View">
                <IconLayoutGrid />
              </ToggleButton>
              <ToggleButton sx={{ borderRadius: 2 }} variant="contained" value="list" title="List View">
                <IconList />
              </ToggleButton>
            </ToggleButtonGroup>

            {/* Add New is now a plain Button so everyone can see it */}
            <Button
  variant="contained"
  onClick={() => setOpenCreate(true)}
  startIcon={<IconPlus />}
  sx={{
    borderRadius: 2,
    height: 40,
    backgroundColor: '#1c1917',
    color: '#fff',
    '&:hover': {
      backgroundColor: '#1c1917'
    }
  }}
>
  Add New
</Button>

          </ViewHeader>

          {!isLoading && showcaseEnabledData.length > 0 && (
            <>
              {/* CARD VIEW */}
              {!view || view === 'card' ? (
                <Stack spacing={4}>
                  {groupedAgentflows &&
                    Object.entries(groupedAgentflows).map(([category, items]) => (
                      <Box key={category}>
                        <Box
                          sx={{
                            mb: 2,
                            px: 2.5,
                            py: 0.8,
                            display: 'inline-block',
                            borderRadius: '20px',
                            backgroundColor:
                              theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[200],
                            color: theme.palette.text.primary,
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            boxShadow: theme.shadows[1]
                          }}
                        >
                          {category}
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
                /* LIST VIEW */
                <Box sx={{ borderRadius: 2, overflow: 'hidden', border: `1px solid ${theme.palette.divider}` }}>
                  <Table size="medium">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Tags</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Last Modified Date</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredShowcaseData.map((row) => {
                        const urlToOpen = getShareUrl(row.id)
                        const tagList = Array.isArray(row.tags)
                          ? row.tags
                          : row.tags
                          ? row.tags
                              .split(',')
                              .map((t) => t.trim())
                              .filter(Boolean)
                          : []

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
                            <TableCell>
                              <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                                {tagList.length ? tagList.map((t) => <Chip key={t} label={t} size="small" />) : '—'}
                              </Stack>
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

              <TablePagination currentPage={currentPage} limit={pageLimit} total={paginationTotal} onChange={onChange} />
            </>
          )}

          {!isLoading && showcaseEnabledData.length === 0 && (
            <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection="column">
              <Box sx={{ p: 2, height: 'auto' }}>
                <img
                  style={{ objectFit: 'cover', height: '12vh', width: 'auto' }}
                  src={AgentsEmptySVG}
                  alt="AgentsEmptySVG"
                />
              </Box>
              <div>No Agents in Showcase Yet</div>
            </Stack>
          )}
        </Stack>
      )}
      <ConfirmDialog />

      {/* Showcase Add dialog */}
      <ShowcaseAddDialog open={openCreate} onClose={() => setOpenCreate(false)} onSave={createAgentflow} />
    </MainCard>
  )
}

export default Showcase
