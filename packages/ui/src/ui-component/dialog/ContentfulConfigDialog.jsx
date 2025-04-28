import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import {
    Typography,
    Button,
    Table,
    TextField,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Select,
    MenuItem,
    Checkbox,
    ListItemText,
    List,
    ListItem,
    ListItemIcon,
    Tabs,
    Tab,
    Box,
    CircularProgress,
    FormControl,
    InputLabel
} from '@mui/material'
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material'
import * as contentful from 'contentful'

import credentialsApi from '@/api/credentials'

function TabPanel(props) {
    const { children, value, index, ...other } = props

    return (
        <div role='tabpanel' hidden={value !== index} id={`simple-tabpanel-${index}`} aria-labelledby={`simple-tab-${index}`} {...other}>
            {value === index && <Box sx={{ p: 0 }}>{children}</Box>}
        </div>
    )
}

TabPanel.propTypes = {
    children: PropTypes.node,
    index: PropTypes.number.isRequired,
    value: PropTypes.number.isRequired
}

const ContentfulConfigDialog = ({ open, onClose, onSave, initialValue, nodeData }) => {
    const [contentTypes, setContentTypes] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [activeTab, setActiveTab] = useState(0)
    const [openEmbeddedDialog, setOpenEmbeddedDialog] = useState(false)
    const [editingEmbeddedIndex, setEditingEmbeddedIndex] = useState(null)
    const [currentEmbedded, setCurrentEmbedded] = useState({ contentType: '', fieldsToParse: [] })
    const [config, setConfig] = useState(
        initialValue
            ? JSON.parse(initialValue)
            : {
                  mainContentType: {
                      contentType: '',
                      fieldsToParse: []
                  },
                  embeddedContentTypes: [],
                  richTextParsingRules: {
                      'embedded-asset-block': true,
                      'embedded-entry-block': true,
                      'embedded-entry-inline': true
                  },
                  fieldsForCitation: {
                      titleField: 'fields.title',
                      slugField: 'fields.slug',
                      urlPrefix: 'https://mywebsite.com/'
                  }
              }
    )

    useEffect(() => {
        if (open) {
            fetchContentTypes()
        }
    }, [open])

    const fetchContentTypes = async () => {
        setLoading(true)
        setError(null)
        try {
            const credentialId = nodeData.credential
            const credentialResponse = await credentialsApi.getSpecificCredential(credentialId)
            if (!credentialResponse.data) {
                throw new Error('No credential data found')
            }
            const credentialData = credentialResponse.data.plainDataObj

            if (!credentialData.spaceId) {
                throw new Error('Space ID is missing from credential data')
            }

            const apiType =
                typeof nodeData.inputs.apiType === 'string' ? nodeData.inputs.apiType : nodeData.inputs.apiType?.value || 'preview'

            let accessToken, host
            if (apiType === 'preview') {
                if (!credentialData.previewToken) {
                    throw new Error('Preview token is missing from credential data')
                }
                accessToken = credentialData.previewToken
                host = 'preview.contentful.com'
            } else {
                if (!credentialData.deliveryToken) {
                    throw new Error('Delivery token is missing from credential data')
                }
                accessToken = credentialData.deliveryToken
                host = 'cdn.contentful.com'
            }

            const { spaceId, environmentId = 'master' } = credentialData

            const client = contentful.createClient({
                space: spaceId,
                accessToken,
                environment: environmentId,
                host
            })

            const contentTypesResponse = await client.getContentTypes()
            setContentTypes(contentTypesResponse.items)
        } catch (err) {
            console.error('Error fetching content types:', err)
            setError(`Failed to fetch content types: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }

    const handleMainContentTypeChange = (e) => {
        const contentType = contentTypes.find((ct) => ct.sys.id === e.target.value)
        setConfig((prevConfig) => ({
            ...prevConfig,
            mainContentType: {
                contentType: e.target.value,
                fieldsToParse: []
            }
        }))
    }

    const handleMainFieldToggle = (fieldId) => {
        setConfig((prevConfig) => {
            const fieldsToParse = prevConfig.mainContentType.fieldsToParse.includes(fieldId)
                ? prevConfig.mainContentType.fieldsToParse.filter((f) => f !== fieldId)
                : [...prevConfig.mainContentType.fieldsToParse, fieldId]
            return {
                ...prevConfig,
                mainContentType: {
                    ...prevConfig.mainContentType,
                    fieldsToParse
                }
            }
        })
    }

    const handleSave = () => {
        onSave(JSON.stringify(config))
    }

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue)
    }

    const handleOpenEmbeddedDialog = (index = null) => {
        if (index !== null) {
            setCurrentEmbedded(config.embeddedContentTypes[index])
            setEditingEmbeddedIndex(index)
        } else {
            setCurrentEmbedded({ contentType: '', fieldsToParse: [] })
            setEditingEmbeddedIndex(null)
        }
        setOpenEmbeddedDialog(true)
    }

    const handleCloseEmbeddedDialog = () => {
        setOpenEmbeddedDialog(false)
        setCurrentEmbedded({ contentType: '', fieldsToParse: [] })
        setEditingEmbeddedIndex(null)
    }

    const handleSaveEmbeddedType = () => {
        setConfig((prevConfig) => {
            const newEmbeddedTypes = [...prevConfig.embeddedContentTypes]
            if (editingEmbeddedIndex !== null) {
                newEmbeddedTypes[editingEmbeddedIndex] = currentEmbedded
            } else {
                newEmbeddedTypes.push(currentEmbedded)
            }
            return { ...prevConfig, embeddedContentTypes: newEmbeddedTypes }
        })
        handleCloseEmbeddedDialog()
    }

    const handleRemoveEmbeddedType = (index) => {
        setConfig((prevConfig) => ({
            ...prevConfig,
            embeddedContentTypes: prevConfig.embeddedContentTypes.filter((_, i) => i !== index)
        }))
    }

    const MainContentTypeSection = () => {
        const handleMainFieldToggle = (fieldId) => {
            setConfig((prevConfig) => {
                const fieldsToParse = prevConfig.mainContentType.fieldsToParse.includes(fieldId)
                    ? prevConfig.mainContentType.fieldsToParse.filter((f) => f !== fieldId)
                    : [...prevConfig.mainContentType.fieldsToParse, fieldId]
                return {
                    ...prevConfig,
                    mainContentType: {
                        ...prevConfig.mainContentType,
                        fieldsToParse
                    }
                }
            })
        }

        return (
            <>
                <Typography variant='h6'>Main Content Type</Typography>
                <Select value={config.mainContentType.contentType} onChange={handleMainContentTypeChange} fullWidth>
                    {contentTypes.map((contentType) => (
                        <MenuItem key={contentType.sys.id} value={contentType.sys.id}>
                            {contentType.name}
                        </MenuItem>
                    ))}
                </Select>
                {config.mainContentType.contentType && (
                    <List>
                        {contentTypes
                            .find((ct) => ct.sys.id === config.mainContentType.contentType)
                            .fields.map((field) => (
                                <ListItem key={field.id}>
                                    <ListItemIcon>
                                        <Checkbox
                                            edge='start'
                                            checked={config.mainContentType.fieldsToParse.includes(`fields.${field.id}`)}
                                            onChange={() => handleMainFieldToggle(`fields.${field.id}`)}
                                        />
                                    </ListItemIcon>
                                    <ListItemText primary={field.name} secondary={field.id} />
                                </ListItem>
                            ))}
                    </List>
                )}
            </>
        )
    }

    const EmbeddedContentTypesSection = () => {
        const handleSelectAllFields = (contentTypeId) => {
            const allFields = contentTypes.find((ct) => ct.sys.id === contentTypeId)?.fields || []
            setCurrentEmbedded((prev) => ({
                ...prev,
                fieldsToParse: allFields.map((field) => `fields.${field.id}`)
            }))
        }

        const handleUnselectAllFields = () => {
            setCurrentEmbedded((prev) => ({
                ...prev,
                fieldsToParse: []
            }))
        }

        const handleFieldToggle = (fieldId) => {
            setCurrentEmbedded((prev) => ({
                ...prev,
                fieldsToParse: prev.fieldsToParse.includes(fieldId)
                    ? prev.fieldsToParse.filter((f) => f !== fieldId)
                    : [...prev.fieldsToParse, fieldId]
            }))
        }

        return (
            <>
                <Typography variant='h6' gutterBottom>
                    Embedded Content Types
                </Typography>
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Content Type</TableCell>
                                <TableCell>Fields to Parse</TableCell>
                                <TableCell align='right'>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {config.embeddedContentTypes.map((embedded, index) => (
                                <TableRow key={index}>
                                    <TableCell>
                                        {contentTypes.find((ct) => ct.sys.id === embedded.contentType)?.name || embedded.contentType}
                                    </TableCell>
                                    <TableCell>{embedded.fieldsToParse.map((field) => field.replace('fields.', '')).join(', ')}</TableCell>
                                    <TableCell align='right'>
                                        <IconButton onClick={() => handleOpenEmbeddedDialog(index)}>
                                            <EditIcon />
                                        </IconButton>
                                        <IconButton onClick={() => handleRemoveEmbeddedType(index)}>
                                            <DeleteIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                <Button startIcon={<AddIcon />} onClick={() => handleOpenEmbeddedDialog()} style={{ marginTop: '1rem' }}>
                    Add Embedded Content Type
                </Button>

                <Dialog open={openEmbeddedDialog} onClose={handleCloseEmbeddedDialog} maxWidth='md' fullWidth>
                    <DialogTitle>{editingEmbeddedIndex !== null ? 'Edit' : 'Add'} Embedded Content Type</DialogTitle>
                    <DialogContent>
                        <Select
                            value={currentEmbedded.contentType}
                            onChange={(e) => {
                                setCurrentEmbedded((prev) => ({ ...prev, contentType: e.target.value, fieldsToParse: [] }))
                            }}
                            fullWidth
                            style={{ marginTop: '1rem', marginBottom: '1rem' }}
                        >
                            {contentTypes.map((contentType) => (
                                <MenuItem key={contentType.sys.id} value={contentType.sys.id}>
                                    {contentType.name}
                                </MenuItem>
                            ))}
                        </Select>
                        {currentEmbedded.contentType && (
                            <>
                                <Box display='flex' justifyContent='space-between' marginBottom='1rem'>
                                    <Button onClick={() => handleSelectAllFields(currentEmbedded.contentType)}>Select All</Button>
                                    <Button onClick={handleUnselectAllFields}>Unselect All</Button>
                                </Box>
                                <List>
                                    {contentTypes
                                        .find((ct) => ct.sys.id === currentEmbedded.contentType)
                                        ?.fields.map((field) => (
                                            <ListItem key={field.id} dense button onClick={() => handleFieldToggle(`fields.${field.id}`)}>
                                                <ListItemIcon>
                                                    <Checkbox
                                                        edge='start'
                                                        checked={currentEmbedded.fieldsToParse.includes(`fields.${field.id}`)}
                                                        tabIndex={-1}
                                                        disableRipple
                                                    />
                                                </ListItemIcon>
                                                <ListItemText primary={field.name} secondary={field.id} />
                                            </ListItem>
                                        ))}
                                </List>
                            </>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseEmbeddedDialog}>Cancel</Button>
                        <Button onClick={handleSaveEmbeddedType} variant='contained' color='primary'>
                            Save
                        </Button>
                    </DialogActions>
                </Dialog>
            </>
        )
    }

    const RichTextParsingRulesSection = () => (
        <>
            <Typography variant='h6'>Rich Text Parsing Rules</Typography>
            {Object.entries(config.richTextParsingRules).map(([key, value]) => (
                <div key={key}>
                    <Checkbox
                        checked={value}
                        onChange={(e) =>
                            setConfig((prevConfig) => ({
                                ...prevConfig,
                                richTextParsingRules: {
                                    ...prevConfig.richTextParsingRules,
                                    [key]: e.target.checked
                                }
                            }))
                        }
                    />
                    <Typography component='span'>{key}</Typography>
                </div>
            ))}
        </>
    )

    const FieldsForCitationSection = () => {
        const mainContentType = contentTypes.find((ct) => ct.sys.id === config.mainContentType.contentType)
        const availableFields = mainContentType ? mainContentType.fields.map((field) => `fields.${field.id}`) : []

        return (
            <>
                <Typography variant='h6' gutterBottom>
                    Fields for Citation
                </Typography>
                {Object.entries(config.fieldsForCitation).map(([key, value]) => (
                    <FormControl key={key} fullWidth margin='normal'>
                        <InputLabel id={`${key}-label`}>
                            {key === 'urlPrefix' ? 'URL Prefix' : key === 'titleField' ? 'Citation Title Field' : 'Citation Slug Field'}
                        </InputLabel>
                        {key === 'urlPrefix' ? (
                            <TextField
                                label={`${key}-label`}
                                value={value}
                                onChange={(e) =>
                                    setConfig((prevConfig) => ({
                                        ...prevConfig,
                                        fieldsForCitation: {
                                            ...prevConfig.fieldsForCitation,
                                            [key]: e.target.value
                                        }
                                    }))
                                }
                                fullWidth
                            />
                        ) : (
                            <Select
                                labelId={`${key}-label`}
                                value={value}
                                label={key === 'titleField' ? 'Citation Title Field' : 'Citation Slug Field'}
                                onChange={(e) =>
                                    setConfig((prevConfig) => ({
                                        ...prevConfig,
                                        fieldsForCitation: {
                                            ...prevConfig.fieldsForCitation,
                                            [key]: e.target.value
                                        }
                                    }))
                                }
                            >
                                {availableFields.map((field) => (
                                    <MenuItem key={field} value={field}>
                                        {field}
                                    </MenuItem>
                                ))}
                            </Select>
                        )}
                    </FormControl>
                ))}
            </>
        )
    }

    return (
        <Dialog open={open} onClose={onClose} maxWidth='md' fullWidth>
            <DialogTitle>Contentful Configuration</DialogTitle>
            <DialogContent>
                {loading && <CircularProgress />}
                {error && <p style={{ color: 'red' }}>{error}</p>}
                {!loading && !error && (
                    <>
                        <Tabs value={activeTab} onChange={handleTabChange} aria-label='contentful config tabs'>
                            <Tab label='Main Content Type' />
                            <Tab label='Embedded Content Types' />
                            <Tab label='Rich Text Settings' />
                            <Tab label='Citation Fields' />
                        </Tabs>
                        <TabPanel value={activeTab} index={0}>
                            <MainContentTypeSection />
                        </TabPanel>
                        <TabPanel value={activeTab} index={1}>
                            <EmbeddedContentTypesSection />
                        </TabPanel>
                        <TabPanel value={activeTab} index={2}>
                            <RichTextParsingRulesSection />
                        </TabPanel>
                        <TabPanel value={activeTab} index={3}>
                            <FieldsForCitationSection />
                        </TabPanel>
                    </>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSave} variant='contained' color='primary' disabled={loading || error}>
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    )
}

ContentfulConfigDialog.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired,
    initialValue: PropTypes.string,
    nodeData: PropTypes.shape({
        credential: PropTypes.string.isRequired,
        inputs: PropTypes.shape({
            apiType: PropTypes.oneOfType([
                PropTypes.string,
                PropTypes.shape({
                    value: PropTypes.string.isRequired
                })
            ])
        })
    }).isRequired
}

export default ContentfulConfigDialog
