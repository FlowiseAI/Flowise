import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'
import { useDispatch } from 'react-redux'
import { useContext, useState, useEffect } from 'react'
import PerfectScrollbar from 'react-perfect-scrollbar'
import { CopyBlock, atomOneDark } from 'react-code-blocks'

import {
    Dialog,
    DialogContent,
    DialogTitle,
    Button,
    Box,
    Tabs,
    Tab,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Typography
} from '@mui/material'

import { CheckboxInput } from '@/ui-component/checkbox/Checkbox'
import { BackdropLoader } from '@/ui-component/loading/BackdropLoader'
import { TableViewOnly } from '@/ui-component/table/Table'

import { IconX, IconBulb } from '@tabler/icons-react'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import pythonSVG from '@/assets/images/python.svg'
import javascriptSVG from '@/assets/images/javascript.svg'
import cURLSVG from '@/assets/images/cURL.svg'

import useApi from '@/hooks/useApi'
import configApi from '@/api/config'
import vectorstoreApi from '@/api/vectorstore'

// Utils
import {
    getUpsertDetails,
    getFileName,
    unshiftFiles,
    getConfigExamplesForJS,
    getConfigExamplesForPython,
    getConfigExamplesForCurl
} from '@/utils/genericHelper'
import useNotifier from '@/utils/useNotifier'

// Store
import { flowContext } from '@/store/context/ReactFlowContext'
import { HIDE_CANVAS_DIALOG, SHOW_CANVAS_DIALOG } from '@/store/actions'
import { baseURL } from '@/store/constant'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from '@/store/actions'

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

function a11yProps(index) {
    return {
        id: `attachment-tab-${index}`,
        'aria-controls': `attachment-tabpanel-${index}`
    }
}

const VectorStoreDialog = ({ show, dialogProps, onCancel, onIndexResult }) => {
    const portalElement = document.getElementById('portal')
    const { reactFlowInstance } = useContext(flowContext)
    const dispatch = useDispatch()

    useNotifier()
    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))
    const getConfigApi = useApi(configApi.getConfig)

    const [nodes, setNodes] = useState([])
    const [loading, setLoading] = useState(false)
    const [isFormDataRequired, setIsFormDataRequired] = useState({})
    const [nodeConfigExpanded, setNodeConfigExpanded] = useState({})
    const [nodeCheckboxExpanded, setCheckboxExpanded] = useState({})
    const [tabValue, setTabValue] = useState(0)
    const [expandedVectorNodeId, setExpandedVectorNodeId] = useState('')
    const [configData, setConfigData] = useState({})

    const reformatConfigData = (configData, nodes) => {
        return configData.filter((item1) => nodes.some((item2) => item1.nodeId === item2.id))
    }

    const getCode = (codeLang, vectorNodeId, isMultiple, configData) => {
        if (codeLang === 'Python') {
            return `import requests

API_URL = "${baseURL}/api/v1/vector/upsert/${dialogProps.chatflowid}"

def query(payload):
    response = requests.post(API_URL, json=payload)
    return response.json()

output = query({
    ${isMultiple ? `"stopNodeId": "${vectorNodeId}",\n    ` : ``}"overrideConfig": {${getConfigExamplesForPython(
                configData,
                'json',
                isMultiple,
                vectorNodeId
            )}
    }
})
`
        } else if (codeLang === 'JavaScript') {
            return `async function query(data) {
    const response = await fetch(
        "${baseURL}/api/v1/vector/upsert/${dialogProps.chatflowid}",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        }
    );
    const result = await response.json();
    return result;
}

query({
  ${isMultiple ? `"stopNodeId": "${vectorNodeId}",\n  ` : ``}"overrideConfig": {${getConfigExamplesForJS(
                configData,
                'json',
                isMultiple,
                vectorNodeId
            )}
  }
}).then((response) => {
    console.log(response);
});
`
        } else if (codeLang === 'cURL') {
            return `curl ${baseURL}/api/v1/vector/upsert/${dialogProps.chatflowid} \\
      -X POST \\
      ${
          isMultiple
              ? `-d '{"stopNodeId": "${vectorNodeId}", "overrideConfig": {${getConfigExamplesForCurl(
                    configData,
                    'json',
                    isMultiple,
                    vectorNodeId
                )}}' \\`
              : `-d '{"overrideConfig": {${getConfigExamplesForCurl(configData, 'json', isMultiple, vectorNodeId)}}' \\`
      }
      -H "Content-Type: application/json"`
        }
        return ''
    }

    const getCodeWithFormData = (codeLang, vectorNodeId, isMultiple, configData) => {
        if (codeLang === 'Python') {
            configData = unshiftFiles(configData)
            let fileType = configData[0].type
            if (fileType.includes(',')) fileType = fileType.split(',')[0]
            return `import requests

API_URL = "${baseURL}/api/v1/vector/upsert/${dialogProps.chatflowid}"

# use form data to upload files
form_data = {
    "files": ${`('example${fileType}', open('example${fileType}', 'rb'))`}
}
body_data = {${getConfigExamplesForPython(configData, 'formData', isMultiple, vectorNodeId)}}

def query(form_data, body_data):
    response = requests.post(API_URL, files=form_data, data=body_data)
    return response.json()

output = query(form_data, body_data)
`
        } else if (codeLang === 'JavaScript') {
            return `// use FormData to upload files
let formData = new FormData();
${getConfigExamplesForJS(configData, 'formData', isMultiple, vectorNodeId)}
async function query(formData) {
    const response = await fetch(
        "${baseURL}/api/v1/vector/upsert/${dialogProps.chatflowid}",
        {
            method: "POST",
            body: formData
        }
    );
    const result = await response.json();
    return result;
}

query(formData).then((response) => {
    console.log(response);
});
`
        } else if (codeLang === 'cURL') {
            return `curl ${baseURL}/api/v1/vector/upsert/${dialogProps.chatflowid} \\
     -X POST \\${getConfigExamplesForCurl(configData, 'formData', isMultiple, vectorNodeId)} \\
     -H "Content-Type: multipart/form-data"`
        }
        return ''
    }

    const getMultiConfigCodeWithFormData = (codeLang) => {
        if (codeLang === 'Python') {
            return `# Specify multiple values for a config parameter by specifying the node id
body_data = {
    "openAIApiKey": {
        "chatOpenAI_0": "sk-my-openai-1st-key",
        "openAIEmbeddings_0": "sk-my-openai-2nd-key"
    }
}`
        } else if (codeLang === 'JavaScript') {
            return `// Specify multiple values for a config parameter by specifying the node id
formData.append("openAIApiKey[chatOpenAI_0]", "sk-my-openai-1st-key")
formData.append("openAIApiKey[openAIEmbeddings_0]", "sk-my-openai-2nd-key")`
        } else if (codeLang === 'cURL') {
            return `-F "openAIApiKey[chatOpenAI_0]=sk-my-openai-1st-key" \\
-F "openAIApiKey[openAIEmbeddings_0]=sk-my-openai-2nd-key" \\`
        }
    }

    const getMultiConfigCode = () => {
        return `{
    "overrideConfig": {
        "openAIApiKey": {
            "chatOpenAI_0": "sk-my-openai-1st-key",
            "openAIEmbeddings_0": "sk-my-openai-2nd-key"
        }
    }
}`
    }

    const getLang = (codeLang) => {
        if (codeLang === 'Python') {
            return 'python'
        } else if (codeLang === 'JavaScript') {
            return 'javascript'
        } else if (codeLang === 'cURL') {
            return 'bash'
        }
        return 'python'
    }

    const getSVG = (codeLang) => {
        if (codeLang === 'Python') {
            return pythonSVG
        } else if (codeLang === 'JavaScript') {
            return javascriptSVG
        } else if (codeLang === 'Embed') {
            return EmbedSVG
        } else if (codeLang === 'cURL') {
            return cURLSVG
        } else if (codeLang === 'Share Chatbot') {
            return ShareChatbotSVG
        } else if (codeLang === 'Configuration') {
            return settingsSVG
        }
        return pythonSVG
    }

    const handleAccordionChange = (nodeLabel) => (event, isExpanded) => {
        const accordianNodes = { ...nodeConfigExpanded }
        accordianNodes[nodeLabel] = isExpanded
        setNodeConfigExpanded(accordianNodes)
    }

    const onCheckBoxChanged = (vectorNodeId) => {
        const checkboxNodes = { ...nodeCheckboxExpanded }
        if (Object.keys(checkboxNodes).includes(vectorNodeId)) checkboxNodes[vectorNodeId] = !checkboxNodes[vectorNodeId]
        else checkboxNodes[vectorNodeId] = true

        if (checkboxNodes[vectorNodeId] === true) getConfigApi.request(dialogProps.chatflowid)
        setCheckboxExpanded(checkboxNodes)
        setExpandedVectorNodeId(vectorNodeId)

        const newIsFormDataRequired = { ...isFormDataRequired }
        newIsFormDataRequired[vectorNodeId] = false
        setIsFormDataRequired(newIsFormDataRequired)
        const newNodes = nodes.find((node) => node.vectorNode.data.id === vectorNodeId)?.nodes ?? []

        for (const node of newNodes) {
            if (node.data.inputParams.find((param) => param.type === 'file')) {
                newIsFormDataRequired[vectorNodeId] = true
                setIsFormDataRequired(newIsFormDataRequired)
                break
            }
        }
    }

    const onUpsertClicked = async (vectorStoreNode) => {
        setLoading(true)
        try {
            const res = await vectorstoreApi.upsertVectorStore(dialogProps.chatflowid, { stopNodeId: vectorStoreNode.data.id })
            enqueueSnackbar({
                message: 'Succesfully upserted vector store. You can start chatting now!',
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
            setLoading(false)
            if (res && res.data && typeof res.data === 'object') onIndexResult(res.data)
        } catch (error) {
            enqueueSnackbar({
                message: typeof error.response.data === 'object' ? error.response.data.message : error.response.data,
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
            setLoading(false)
        }
    }

    const getNodeDetail = (node) => {
        const nodeDetails = []
        const inputKeys = Object.keys(node.data.inputs)
        for (let i = 0; i < node.data.inputParams.length; i += 1) {
            if (inputKeys.includes(node.data.inputParams[i].name)) {
                nodeDetails.push({
                    label: node.data.inputParams[i].label,
                    name: node.data.inputParams[i].name,
                    type: node.data.inputParams[i].type,
                    value:
                        node.data.inputParams[i].type === 'file'
                            ? getFileName(node.data.inputs[node.data.inputParams[i].name])
                            : node.data.inputs[node.data.inputParams[i].name] ?? ''
                })
            }
        }
        return nodeDetails
    }

    useEffect(() => {
        if (getConfigApi.data) {
            const newConfigData = { ...configData }
            newConfigData[expandedVectorNodeId] = reformatConfigData(
                getConfigApi.data,
                nodes.find((node) => node.vectorNode.data.id === expandedVectorNodeId)?.nodes ?? []
            )
            setConfigData(newConfigData)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getConfigApi.data])

    useEffect(() => {
        if (dialogProps && reactFlowInstance) {
            const nodes = reactFlowInstance.getNodes()
            const edges = reactFlowInstance.getEdges()
            setNodes(getUpsertDetails(nodes, edges))
        }

        return () => {
            setNodes([])
            setLoading(false)
            setIsFormDataRequired({})
            setNodeConfigExpanded({})
            setCheckboxExpanded({})
            setTabValue(0)
            setConfigData({})
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dialogProps])

    useEffect(() => {
        if (show) dispatch({ type: SHOW_CANVAS_DIALOG })
        else dispatch({ type: HIDE_CANVAS_DIALOG })
        return () => dispatch({ type: HIDE_CANVAS_DIALOG })
    }, [show, dispatch])

    const component = show ? (
        <Dialog
            open={show}
            fullWidth
            maxWidth='md'
            onClose={onCancel}
            aria-labelledby='alert-dialog-title'
            aria-describedby='alert-dialog-description'
            sx={{ overflow: 'visible' }}
        >
            <DialogTitle sx={{ fontSize: '1rem' }} id='alert-dialog-title'>
                {dialogProps.title}
            </DialogTitle>
            <DialogContent sx={{ display: 'flex', justifyContent: 'flex-end', flexDirection: 'column' }}>
                <PerfectScrollbar
                    style={{
                        height: '100%',
                        maxHeight: 'calc(100vh - 220px)',
                        overflowX: 'hidden'
                    }}
                >
                    {nodes.length > 0 &&
                        nodes.map((data, index) => {
                            return (
                                <div key={index}>
                                    {data.nodes.length > 0 &&
                                        data.nodes.map((node, index) => {
                                            return (
                                                <Accordion
                                                    expanded={nodeConfigExpanded[node.data.id] || false}
                                                    onChange={handleAccordionChange(node.data.id)}
                                                    key={index}
                                                    disableGutters
                                                >
                                                    <AccordionSummary
                                                        expandIcon={<ExpandMoreIcon />}
                                                        aria-controls={`nodes-accordian-${node.data.name}`}
                                                        id={`nodes-accordian-header-${node.data.name}`}
                                                    >
                                                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                                                            <div
                                                                style={{
                                                                    width: 40,
                                                                    height: 40,
                                                                    marginRight: 10,
                                                                    borderRadius: '50%',
                                                                    backgroundColor: 'white'
                                                                }}
                                                            >
                                                                <img
                                                                    style={{
                                                                        width: '100%',
                                                                        height: '100%',
                                                                        padding: 7,
                                                                        borderRadius: '50%',
                                                                        objectFit: 'contain'
                                                                    }}
                                                                    alt={node.data.name}
                                                                    src={`${baseURL}/api/v1/node-icon/${node.data.name}`}
                                                                />
                                                            </div>
                                                            <Typography variant='h5'>{node.data.label}</Typography>
                                                            <div
                                                                style={{
                                                                    display: 'flex',
                                                                    flexDirection: 'row',
                                                                    width: 'max-content',
                                                                    borderRadius: 15,
                                                                    background: 'rgb(254,252,191)',
                                                                    padding: 5,
                                                                    paddingLeft: 10,
                                                                    paddingRight: 10,
                                                                    marginLeft: 10
                                                                }}
                                                            >
                                                                <span style={{ color: 'rgb(116,66,16)', fontSize: '0.825rem' }}>
                                                                    {node.data.id}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </AccordionSummary>
                                                    <AccordionDetails>
                                                        <TableViewOnly
                                                            sx={{ minWidth: 'max-content' }}
                                                            rows={getNodeDetail(node)}
                                                            columns={Object.keys(getNodeDetail(node)[0])}
                                                        />
                                                    </AccordionDetails>
                                                </Accordion>
                                            )
                                        })}
                                    <Box sx={{ p: 2 }}>
                                        <CheckboxInput
                                            key={JSON.stringify(nodeCheckboxExpanded)}
                                            label='Show API'
                                            value={nodeCheckboxExpanded[data.vectorNode.data.id]}
                                            onChange={() => onCheckBoxChanged(data.vectorNode.data.id)}
                                        />
                                        {nodeCheckboxExpanded[data.vectorNode.data.id] && (
                                            <div>
                                                <Tabs value={tabValue} onChange={(event, val) => setTabValue(val)} aria-label='tabs'>
                                                    {['Python', 'JavaScript', 'cURL'].map((codeLang, index) => (
                                                        <Tab
                                                            icon={
                                                                <img
                                                                    style={{ objectFit: 'cover', height: 15, width: 'auto' }}
                                                                    src={getSVG(codeLang)}
                                                                    alt='code'
                                                                />
                                                            }
                                                            iconPosition='start'
                                                            key={index}
                                                            label={codeLang}
                                                            {...a11yProps(index)}
                                                        ></Tab>
                                                    ))}
                                                </Tabs>
                                            </div>
                                        )}
                                        {nodeCheckboxExpanded[data.vectorNode.data.id] &&
                                            isFormDataRequired[data.vectorNode.data.id] !== undefined &&
                                            configData[data.vectorNode.data.id] &&
                                            configData[data.vectorNode.data.id].length > 0 && (
                                                <>
                                                    <div style={{ marginTop: 10 }}>
                                                        {['Python', 'JavaScript', 'cURL'].map((codeLang, index) => (
                                                            <TabPanel key={index} value={tabValue} index={index}>
                                                                <CopyBlock
                                                                    theme={atomOneDark}
                                                                    text={
                                                                        isFormDataRequired[data.vectorNode.data.id]
                                                                            ? getCodeWithFormData(
                                                                                  codeLang,
                                                                                  data.vectorNode.data.id,
                                                                                  nodes.length > 1 ? true : false,
                                                                                  configData[data.vectorNode.data.id]
                                                                              )
                                                                            : getCode(
                                                                                  codeLang,
                                                                                  data.vectorNode.data.id,
                                                                                  nodes.length > 1 ? true : false,
                                                                                  configData[data.vectorNode.data.id]
                                                                              )
                                                                    }
                                                                    language={getLang(codeLang)}
                                                                    showLineNumbers={false}
                                                                    wrapLines
                                                                />
                                                                <div
                                                                    style={{
                                                                        display: 'flex',
                                                                        flexDirection: 'column',
                                                                        borderRadius: 10,
                                                                        background: '#d8f3dc',
                                                                        padding: 10,
                                                                        marginTop: 10,
                                                                        marginBottom: 10
                                                                    }}
                                                                >
                                                                    <div
                                                                        style={{
                                                                            display: 'flex',
                                                                            flexDirection: 'row',
                                                                            alignItems: 'center'
                                                                        }}
                                                                    >
                                                                        <IconBulb size={30} color='#2d6a4f' />
                                                                        <span style={{ color: '#2d6a4f', marginLeft: 10, fontWeight: 500 }}>
                                                                            You can also specify multiple values for a config parameter by
                                                                            specifying the node id
                                                                        </span>
                                                                    </div>
                                                                    <div style={{ padding: 10 }}>
                                                                        <CopyBlock
                                                                            theme={atomOneDark}
                                                                            text={
                                                                                isFormDataRequired
                                                                                    ? getMultiConfigCodeWithFormData(codeLang)
                                                                                    : getMultiConfigCode()
                                                                            }
                                                                            language={getLang(codeLang)}
                                                                            showLineNumbers={false}
                                                                            wrapLines
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </TabPanel>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                    </Box>
                                    <div style={{ marginBottom: '20px' }}>
                                        {loading && <BackdropLoader open={loading} />}
                                        {!loading && (
                                            <Button
                                                sx={{ color: 'white' }}
                                                fullWidth
                                                variant='contained'
                                                color='teal'
                                                title='Upsert'
                                                onClick={() => onUpsertClicked(data.vectorNode)}
                                            >
                                                Upsert
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                </PerfectScrollbar>
            </DialogContent>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

VectorStoreDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func,
    onIndexResult: PropTypes.func
}

export default VectorStoreDialog
