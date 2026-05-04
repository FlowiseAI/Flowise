import { useCallback, useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'

// material-ui
import { Alert, Box, Stack, ButtonGroup, Skeleton, ToggleButtonGroup, ToggleButton, Tabs, Tab } from '@mui/material'
import { useTheme } from '@mui/material/styles'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import ItemCard from '@/ui-component/cards/ItemCard'
import MCPItemCard from '@/ui-component/cards/MCPItemCard'
import ToolDialog from './ToolDialog'
import CustomMcpServerDialog from './CustomMcpServerDialog'
import SkillCard from '@/views/skills/SkillCard'
import SkillCreateDialog from '@/views/skills/SkillCreateDialog'
import SkillEditDialog from '@/views/skills/SkillEditDialog'
import SkillEditorDrawer from '@/views/skills/SkillEditorDrawer'
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import ErrorBoundary from '@/ErrorBoundary'
import { ToolsTable } from '@/ui-component/table/ToolsListTable'
import { MCPServersTable } from '@/ui-component/table/MCPServersTable'
import { SkillsTable } from '@/ui-component/table/SkillsTable'
import { PermissionButton, StyledPermissionButton } from '@/ui-component/button/RBACButtons'
import TablePagination, { DEFAULT_ITEMS_PER_PAGE } from '@/ui-component/pagination/TablePagination'

// API
import toolsApi from '@/api/tools'
import customMcpServersApi from '@/api/custommcpservers'
import skillsApi from '@/api/skills'

// Hooks
import useApi from '@/hooks/useApi'
import { useError } from '@/store/context/ErrorContext'
import { gridSpacing } from '@/store/constant'

// icons
import { IconPlus, IconFileUpload, IconLayoutGrid, IconList } from '@tabler/icons-react'
import ToolEmptySVG from '@/assets/images/tools_empty.svg'

// ==============================|| TOOLS ||============================== //

const Tools = () => {
    const theme = useTheme()
    const getAllToolsApi = useApi(toolsApi.getAllTools)
    const getAllCustomMcpServersApi = useApi(customMcpServersApi.getAllCustomMcpServers)
    const { error, setError } = useError()

    const [tabValue, setTabValue] = useState(0)

    const [isLoading, setLoading] = useState(true)
    const [showDialog, setShowDialog] = useState(false)
    const [dialogProps, setDialogProps] = useState({})
    const [view, setView] = useState(localStorage.getItem('toolsDisplayStyle') || 'card')

    const inputRef = useRef(null)

    // MCP Servers state
    const [mcpLoading, setMcpLoading] = useState(true)
    const [showMcpDialog, setShowMcpDialog] = useState(false)
    const [mcpDialogProps, setMcpDialogProps] = useState({})
    const [mcpTotal, setMcpTotal] = useState(0)
    const [mcpCurrentPage, setMcpCurrentPage] = useState(1)
    const [mcpPageLimit, setMcpPageLimit] = useState(DEFAULT_ITEMS_PER_PAGE)

    // Skills state
    const user = useSelector((state) => state.auth.user)
    const workspaceId = user?.activeWorkspaceId || ''
    const [skills, setSkills] = useState([])
    const [skillsLoading, setSkillsLoading] = useState(true)
    const [skillsError, setSkillsError] = useState('')
    const [showSkillDialog, setShowSkillDialog] = useState(false)
    const [skillDialogProps, setSkillDialogProps] = useState({ type: 'ADD' })
    const [showSkillEditDialog, setShowSkillEditDialog] = useState(false)
    const [skillEditDialogProps, setSkillEditDialogProps] = useState({})
    const [editorOpen, setEditorOpen] = useState(false)
    const [editorSkillId, setEditorSkillId] = useState(null)

    /* Table Pagination */
    const [currentPage, setCurrentPage] = useState(1)
    const [pageLimit, setPageLimit] = useState(DEFAULT_ITEMS_PER_PAGE)
    const [total, setTotal] = useState(0)

    const onChange = (page, pageLimit) => {
        setCurrentPage(page)
        setPageLimit(pageLimit)
        refresh(page, pageLimit)
    }

    const refresh = (page, limit) => {
        const params = {
            page: page || currentPage,
            limit: limit || pageLimit
        }
        getAllToolsApi.request(params)
    }

    const onCustomMcpPageChange = (page, limit) => {
        setMcpCurrentPage(page)
        setMcpPageLimit(limit)
        refreshCustomMcp(page, limit)
    }

    const refreshCustomMcp = (page, limit) => {
        const params = {
            page: page || mcpCurrentPage,
            limit: limit || mcpPageLimit
        }
        getAllCustomMcpServersApi.request(params)
    }

    const handleChange = (event, nextView) => {
        if (nextView === null) return
        localStorage.setItem('toolsDisplayStyle', nextView)
        setView(nextView)
    }

    const onUploadFile = (file) => {
        try {
            const dialogProp = {
                title: 'Add New Tool',
                type: 'IMPORT',
                cancelButtonName: 'Cancel',
                confirmButtonName: 'Save',
                data: JSON.parse(file)
            }
            setDialogProps(dialogProp)
            setShowDialog(true)
        } catch (e) {
            console.error(e)
        }
    }

    const handleFileUpload = (e) => {
        if (!e.target.files) return

        const file = e.target.files[0]

        const reader = new FileReader()
        reader.onload = (evt) => {
            if (!evt?.target?.result) {
                return
            }
            const { result } = evt.target
            onUploadFile(result)
        }
        reader.readAsText(file)
    }

    const addNew = () => {
        const dialogProp = {
            title: 'Add New Tool',
            type: 'ADD',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Add'
        }
        setDialogProps(dialogProp)
        setShowDialog(true)
    }

    const edit = (selectedTool) => {
        const dialogProp = {
            title: 'Edit Tool',
            type: 'EDIT',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Save',
            data: selectedTool
        }
        setDialogProps(dialogProp)
        setShowDialog(true)
    }

    const onConfirm = () => {
        setShowDialog(false)
        refresh(currentPage, pageLimit)
    }

    const onAuthorize = () => {
        refreshCustomMcp(mcpCurrentPage, mcpPageLimit)
    }

    // MCP Server handlers
    const addNewCustomMcpServer = () => {
        setMcpDialogProps({ type: 'ADD' })
        setShowMcpDialog(true)
    }

    const editCustomMcpServer = async (server) => {
        try {
            const resp = await customMcpServersApi.getCustomMcpServer(server.id)
            setMcpDialogProps({ type: 'EDIT', data: resp.data ?? server })
        } catch {
            setMcpDialogProps({ type: 'EDIT', data: server })
        }
        setShowMcpDialog(true)
    }

    const onCustomMcpConfirm = () => {
        setShowMcpDialog(false)
        refreshCustomMcp(mcpCurrentPage, mcpPageLimit)
    }

    const onCustomMcpCreated = async (newServerId) => {
        refreshCustomMcp(mcpCurrentPage, mcpPageLimit)
        try {
            const resp = await customMcpServersApi.getCustomMcpServer(newServerId)
            setMcpDialogProps({ type: 'EDIT', data: resp.data ?? { id: newServerId } })
        } catch {
            setMcpDialogProps({ type: 'EDIT', data: { id: newServerId } })
        }
    }

    // Skill handlers
    const refreshSkills = useCallback(async () => {
        setSkillsLoading(true)
        setSkillsError('')
        try {
            const resp = await skillsApi.listSkills()
            const data = Array.isArray(resp.data) ? resp.data : resp.data?.data || []
            setSkills(data)
        } catch (err) {
            const msg = typeof err?.response?.data === 'object' ? err.response.data.message : err?.response?.data || err?.message
            setSkillsError(msg || 'Failed to load skills')
        } finally {
            setSkillsLoading(false)
        }
    }, [])

    const addNewSkill = () => {
        setSkillDialogProps({ type: 'ADD' })
        setShowSkillDialog(true)
    }

    const editSkill = (skill) => {
        setSkillEditDialogProps({ data: skill })
        setShowSkillEditDialog(true)
    }

    const onSkillConfirm = (created) => {
        setShowSkillDialog(false)
        refreshSkills()
        if (created?.id) {
            setEditorSkillId(created.id)
            setEditorOpen(true)
        }
    }

    const onSkillEditConfirm = () => {
        refreshSkills()
    }

    const onSkillDeleted = () => {
        setShowSkillEditDialog(false)
        refreshSkills()
    }

    const onSkillOpenEditor = (skill) => {
        if (!skill?.id) return
        setShowSkillEditDialog(false)
        setEditorSkillId(skill.id)
        setEditorOpen(true)
    }

    const onSkillEditorClose = () => {
        setEditorOpen(false)
        setEditorSkillId(null)
        refreshSkills()
    }

    const [search, setSearch] = useState('')
    const onSearchChange = (event) => {
        setSearch(event.target.value)
    }

    function filterTools(data) {
        return (
            data.name.toLowerCase().indexOf(search.toLowerCase()) > -1 || data.description.toLowerCase().indexOf(search.toLowerCase()) > -1
        )
    }

    function filterCustomMcpServers(data) {
        const s = search.toLowerCase()
        return data.name.toLowerCase().indexOf(s) > -1 || (data.serverUrl && data.serverUrl.toLowerCase().indexOf(s) > -1)
    }

    function filterSkills(data) {
        if (!search) return true
        const s = search.toLowerCase()
        return (
            (data.name || '').toLowerCase().indexOf(s) > -1 ||
            (data.description || '').toLowerCase().indexOf(s) > -1 ||
            (data.slug || '').toLowerCase().indexOf(s) > -1
        )
    }

    useEffect(() => {
        if (tabValue === 0) {
            refresh(currentPage, pageLimit)
        } else if (tabValue === 1) {
            refreshCustomMcp(mcpCurrentPage, mcpPageLimit)
        } else if (tabValue === 2) {
            refreshSkills()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tabValue])

    useEffect(() => {
        setLoading(getAllToolsApi.loading)
    }, [getAllToolsApi.loading])

    useEffect(() => {
        if (getAllToolsApi.data) {
            setTotal(getAllToolsApi.data.total)
        }
    }, [getAllToolsApi.data])

    useEffect(() => {
        setMcpLoading(getAllCustomMcpServersApi.loading)
    }, [getAllCustomMcpServersApi.loading])

    useEffect(() => {
        if (getAllCustomMcpServersApi.data) {
            setMcpTotal(getAllCustomMcpServersApi.data.total)
        }
    }, [getAllCustomMcpServersApi.data])

    const viewToggle = (disabled) => (
        <ToggleButtonGroup
            sx={{ borderRadius: 2, maxHeight: 40 }}
            value={view}
            color='primary'
            disabled={disabled}
            exclusive
            onChange={handleChange}
        >
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
    )

    const renderCustomToolsToolbar = () => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {viewToggle(total === 0)}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PermissionButton
                    permissionId={'tools:create'}
                    variant='outlined'
                    onClick={() => inputRef.current.click()}
                    startIcon={<IconFileUpload />}
                    sx={{ borderRadius: 2, height: 40 }}
                >
                    Load
                </PermissionButton>
                <input style={{ display: 'none' }} ref={inputRef} type='file' hidden accept='.json' onChange={(e) => handleFileUpload(e)} />
            </Box>
            <ButtonGroup disableElevation aria-label='outlined primary button group'>
                <StyledPermissionButton
                    permissionId={'tools:create'}
                    variant='contained'
                    onClick={addNew}
                    startIcon={<IconPlus />}
                    sx={{ borderRadius: 2, height: 40 }}
                >
                    Create
                </StyledPermissionButton>
            </ButtonGroup>
        </Box>
    )

    const renderMcpServersToolbar = () => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {viewToggle(mcpTotal === 0)}
            <ButtonGroup disableElevation aria-label='outlined primary button group'>
                <StyledPermissionButton
                    permissionId={'tools:create'}
                    variant='contained'
                    onClick={addNewCustomMcpServer}
                    startIcon={<IconPlus />}
                    sx={{ borderRadius: 2, height: 40 }}
                >
                    Add Custom MCP Server
                </StyledPermissionButton>
            </ButtonGroup>
        </Box>
    )

    const renderSkillsToolbar = () => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {viewToggle(skills.length === 0)}
            <ButtonGroup disableElevation aria-label='outlined primary button group'>
                <StyledPermissionButton
                    permissionId={'tools:create'}
                    variant='contained'
                    onClick={addNewSkill}
                    disabled={!workspaceId}
                    startIcon={<IconPlus />}
                    sx={{ borderRadius: 2, height: 40 }}
                >
                    Create Skill
                </StyledPermissionButton>
            </ButtonGroup>
        </Box>
    )

    const renderCustomToolsTab = () => (
        <>
            {isLoading && (
                <Box display='grid' gridTemplateColumns='repeat(3, 1fr)' gap={gridSpacing}>
                    <Skeleton variant='rounded' height={160} />
                    <Skeleton variant='rounded' height={160} />
                    <Skeleton variant='rounded' height={160} />
                </Box>
            )}
            {!isLoading && total > 0 && (
                <>
                    {!view || view === 'card' ? (
                        <Box display='grid' gridTemplateColumns='repeat(3, 1fr)' gap={gridSpacing}>
                            {getAllToolsApi.data?.data?.filter(filterTools).map((data, index) => (
                                <ItemCard data={data} key={index} onClick={() => edit(data)} />
                            ))}
                        </Box>
                    ) : (
                        <ToolsTable data={getAllToolsApi.data?.data?.filter(filterTools) || []} isLoading={isLoading} onSelect={edit} />
                    )}
                    {/* Pagination and Page Size Controls */}
                    <TablePagination currentPage={currentPage} limit={pageLimit} total={total} onChange={onChange} />
                </>
            )}
            {!isLoading && total === 0 && (
                <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection='column'>
                    <Box sx={{ p: 2, height: 'auto' }}>
                        <img style={{ objectFit: 'cover', height: '20vh', width: 'auto' }} src={ToolEmptySVG} alt='ToolEmptySVG' />
                    </Box>
                    <div>No Tools Created Yet</div>
                </Stack>
            )}
        </>
    )

    const renderMcpServersTab = () => (
        <>
            {mcpLoading && (
                <Box display='grid' gridTemplateColumns='repeat(3, 1fr)' gap={gridSpacing}>
                    <Skeleton variant='rounded' height={160} />
                    <Skeleton variant='rounded' height={160} />
                    <Skeleton variant='rounded' height={160} />
                </Box>
            )}
            {!mcpLoading && mcpTotal > 0 && (
                <>
                    {!view || view === 'card' ? (
                        <Box display='grid' gridTemplateColumns='repeat(3, 1fr)' gap={gridSpacing}>
                            {getAllCustomMcpServersApi.data?.data?.filter(filterCustomMcpServers).map((server) => (
                                <MCPItemCard key={server.id} data={server} onClick={() => editCustomMcpServer(server)} />
                            ))}
                        </Box>
                    ) : (
                        <MCPServersTable
                            data={getAllCustomMcpServersApi.data?.data?.filter(filterCustomMcpServers) || []}
                            isLoading={mcpLoading}
                            onSelect={editCustomMcpServer}
                        />
                    )}
                    <TablePagination currentPage={mcpCurrentPage} limit={mcpPageLimit} total={mcpTotal} onChange={onCustomMcpPageChange} />
                </>
            )}
            {!mcpLoading && mcpTotal === 0 && (
                <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection='column'>
                    <Box sx={{ p: 2, height: 'auto' }}>
                        <img style={{ objectFit: 'cover', height: '20vh', width: 'auto' }} src={ToolEmptySVG} alt='ToolEmptySVG' />
                    </Box>
                    <div>No Custom MCP Servers Added Yet</div>
                </Stack>
            )}
        </>
    )

    const renderSkillsTab = () => {
        const visibleSkills = skills.filter(filterSkills)

        return (
            <>
                {skillsError && (
                    <Alert severity='error' sx={{ mb: 2 }}>
                        {skillsError}
                    </Alert>
                )}
                {skillsLoading && (
                    <Box display='grid' gridTemplateColumns='repeat(3, 1fr)' gap={gridSpacing}>
                        <Skeleton variant='rounded' height={160} />
                        <Skeleton variant='rounded' height={160} />
                        <Skeleton variant='rounded' height={160} />
                    </Box>
                )}
                {!skillsLoading && visibleSkills.length > 0 && (
                    <>
                        {!view || view === 'card' ? (
                            <Box display='grid' gridTemplateColumns='repeat(3, 1fr)' gap={gridSpacing}>
                                {visibleSkills.map((s) => (
                                    <SkillCard key={s.id} data={s} onClick={() => editSkill(s)} />
                                ))}
                            </Box>
                        ) : (
                            <SkillsTable data={visibleSkills} isLoading={skillsLoading} onSelect={editSkill} />
                        )}
                    </>
                )}
                {!skillsLoading && visibleSkills.length === 0 && (
                    <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection='column'>
                        <Box sx={{ p: 2, height: 'auto' }}>
                            <img style={{ objectFit: 'cover', height: '20vh', width: 'auto' }} src={ToolEmptySVG} alt='ToolEmptySVG' />
                        </Box>
                        <div>{search ? 'No skills match your search.' : 'No Skills Created Yet'}</div>
                    </Stack>
                )}
            </>
        )
    }

    return (
        <>
            <MainCard>
                {error ? (
                    <ErrorBoundary error={error} />
                ) : (
                    <Stack flexDirection='column' sx={{ gap: 3 }}>
                        <ViewHeader
                            onSearchChange={onSearchChange}
                            search={true}
                            searchPlaceholder={
                                tabValue === 0 ? 'Search Tools' : tabValue === 1 ? 'Search Custom MCP Servers' : 'Search Skills'
                            }
                            title='Tools'
                            description='External functions or APIs the agent can use to take action'
                        />
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 2,
                                borderBottom: 1,
                                borderColor: 'divider'
                            }}
                        >
                            <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} aria-label='tools tabs'>
                                <Tab label='Custom Tools' />
                                <Tab label='Custom MCP Servers' />
                                <Tab label='Skills' />
                            </Tabs>
                            <Box sx={{ pb: 1 }}>
                                {tabValue === 0
                                    ? renderCustomToolsToolbar()
                                    : tabValue === 1
                                    ? renderMcpServersToolbar()
                                    : renderSkillsToolbar()}
                            </Box>
                        </Box>
                        {tabValue === 0 && renderCustomToolsTab()}
                        {tabValue === 1 && renderMcpServersTab()}
                        {tabValue === 2 && renderSkillsTab()}
                    </Stack>
                )}
            </MainCard>
            <ToolDialog
                show={showDialog}
                dialogProps={dialogProps}
                onCancel={() => setShowDialog(false)}
                onConfirm={onConfirm}
                setError={setError}
            />
            <CustomMcpServerDialog
                show={showMcpDialog}
                dialogProps={mcpDialogProps}
                onCancel={() => {
                    setShowMcpDialog(false)
                }}
                onConfirm={onCustomMcpConfirm}
                onAuthorize={onAuthorize}
                onCreated={onCustomMcpCreated}
            />
            <SkillCreateDialog
                show={showSkillDialog}
                dialogProps={skillDialogProps}
                onCancel={() => setShowSkillDialog(false)}
                onConfirm={onSkillConfirm}
            />
            <SkillEditDialog
                show={showSkillEditDialog}
                dialogProps={skillEditDialogProps}
                onCancel={() => setShowSkillEditDialog(false)}
                onConfirm={onSkillEditConfirm}
                onDelete={onSkillDeleted}
                onOpenEditor={onSkillOpenEditor}
            />
            <SkillEditorDrawer open={editorOpen} workspaceId={workspaceId} skillId={editorSkillId} onClose={onSkillEditorClose} />
        </>
    )
}

export default Tools
