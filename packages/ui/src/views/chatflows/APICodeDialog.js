import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import PropTypes from 'prop-types'

import {
    Tabs,
    Tab,
    Dialog,
    DialogContent,
    DialogTitle,
    Box,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Typography
} from '@mui/material'
import { CopyBlock, atomOneDark } from 'react-code-blocks'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

// Project import
import { Dropdown } from 'ui-component/dropdown/Dropdown'
import ShareChatbot from './ShareChatbot'
import EmbedChat from './EmbedChat'

// Const
import { baseURL } from 'store/constant'
import { SET_CHATFLOW } from 'store/actions'

// Images
import pythonSVG from 'assets/images/python.svg'
import javascriptSVG from 'assets/images/javascript.svg'
import cURLSVG from 'assets/images/cURL.svg'
import EmbedSVG from 'assets/images/embed.svg'
import ShareChatbotSVG from 'assets/images/sharing.png'
import settingsSVG from 'assets/images/settings.svg'

// API
import apiKeyApi from 'api/apikey'
import chatflowsApi from 'api/chatflows'
import configApi from 'api/config'

// Hooks
import useApi from 'hooks/useApi'
import { CheckboxInput } from 'ui-component/checkbox/Checkbox'
import { TableViewOnly } from 'ui-component/table/Table'

import { IconBulb } from '@tabler/icons'
import Configuration from './Configuration'

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

const unshiftFiles = (configData) => {
    const filesConfig = configData.find((config) => config.name === 'files')
    if (filesConfig) {
        configData = configData.filter((config) => config.name !== 'files')
        configData.unshift(filesConfig)
    }
    return configData
}

const getConfigExamplesForJS = (configData, bodyType) => {
    let finalStr = ''
    configData = unshiftFiles(configData)
    const loop = Math.min(configData.length, 4)
    for (let i = 0; i < loop; i += 1) {
        const config = configData[i]
        let exampleVal = `"example"`
        if (config.type === 'string') exampleVal = `"example"`
        else if (config.type === 'boolean') exampleVal = `true`
        else if (config.type === 'number') exampleVal = `1`
        else if (config.name === 'files') exampleVal = `input.files[0]`
        finalStr += bodyType === 'json' ? `\n      "${config.name}": ${exampleVal},` : `formData.append("${config.name}", ${exampleVal})\n`
        if (i === loop - 1 && bodyType !== 'json') finalStr += `formData.append("question", "Hey, how are you?")\n`
    }
    return finalStr
}

const getConfigExamplesForPython = (configData, bodyType) => {
    let finalStr = ''
    configData = unshiftFiles(configData)
    const loop = Math.min(configData.length, 4)
    for (let i = 0; i < loop; i += 1) {
        const config = configData[i]
        let exampleVal = `"example"`
        if (config.type === 'string') exampleVal = `"example"`
        else if (config.type === 'boolean') exampleVal = `true`
        else if (config.type === 'number') exampleVal = `1`
        else if (config.name === 'files') continue
        finalStr += bodyType === 'json' ? `\n        "${config.name}": ${exampleVal},` : `\n    "${config.name}": ${exampleVal},`
        if (i === loop - 1 && bodyType !== 'json') finalStr += `\n    "question": "Hey, how are you?"\n`
    }
    return finalStr
}

const getConfigExamplesForCurl = (configData, bodyType) => {
    let finalStr = ''
    configData = unshiftFiles(configData)
    const loop = Math.min(configData.length, 4)
    for (let i = 0; i < loop; i += 1) {
        const config = configData[i]
        let exampleVal = `example`
        if (config.type === 'string') exampleVal = bodyType === 'json' ? `"example"` : `example`
        else if (config.type === 'boolean') exampleVal = `true`
        else if (config.type === 'number') exampleVal = `1`
        else if (config.name === 'files') exampleVal = `@/home/user1/Desktop/example${config.type}`
        finalStr += bodyType === 'json' ? `"${config.name}": ${exampleVal}` : `\n     -F "${config.name}=${exampleVal}"`
        if (i === loop - 1) finalStr += bodyType === 'json' ? ` }` : ` \\\n     -F "question=Hey, how are you?"`
        else finalStr += bodyType === 'json' ? `, ` : ` \\`
    }
    return finalStr
}

const APICodeDialog = ({ show, dialogProps, onCancel }) => {
    const portalElement = document.getElementById('portal')
    const navigate = useNavigate()
    const dispatch = useDispatch()

    const codes = ['Embed', 'Python', 'JavaScript', 'cURL', 'Share Chatbot', 'Configuration']
    const [value, setValue] = useState(0)
    const [keyOptions, setKeyOptions] = useState([])
    const [apiKeys, setAPIKeys] = useState([])
    const [chatflowApiKeyId, setChatflowApiKeyId] = useState('')
    const [selectedApiKey, setSelectedApiKey] = useState({})
    const [checkboxVal, setCheckbox] = useState(false)
    const [nodeConfig, setNodeConfig] = useState({})
    const [nodeConfigExpanded, setNodeConfigExpanded] = useState({})

    const getAllAPIKeysApi = useApi(apiKeyApi.getAllAPIKeys)
    const updateChatflowApi = useApi(chatflowsApi.updateChatflow)
    const getIsChatflowStreamingApi = useApi(chatflowsApi.getIsChatflowStreaming)
    const getConfigApi = useApi(configApi.getConfig)

    const onCheckBoxChanged = (newVal) => {
        setCheckbox(newVal)
        if (newVal) {
            getConfigApi.request(dialogProps.chatflowid)
        }
    }

    const onApiKeySelected = (keyValue) => {
        if (keyValue === 'addnewkey') {
            navigate('/apikey')
            return
        }
        setChatflowApiKeyId(keyValue)
        setSelectedApiKey(apiKeys.find((key) => key.id === keyValue))
        const updateBody = {
            apikeyid: keyValue
        }
        updateChatflowApi.request(dialogProps.chatflowid, updateBody)
    }

    const groupByNodeLabel = (nodes, isFilter = false) => {
        const accordianNodes = {}
        const result = nodes.reduce(function (r, a) {
            r[a.node] = r[a.node] || []
            r[a.node].push(a)
            accordianNodes[a.node] = isFilter ? true : false
            return r
        }, Object.create(null))
        setNodeConfig(result)
        setNodeConfigExpanded(accordianNodes)
    }

    const handleAccordionChange = (nodeLabel) => (event, isExpanded) => {
        const accordianNodes = { ...nodeConfigExpanded }
        accordianNodes[nodeLabel] = isExpanded
        setNodeConfigExpanded(accordianNodes)
    }

    useEffect(() => {
        if (updateChatflowApi.data) {
            dispatch({ type: SET_CHATFLOW, chatflow: updateChatflowApi.data })
        }
    }, [updateChatflowApi.data, dispatch])

    useEffect(() => {
        if (getConfigApi.data) {
            groupByNodeLabel(getConfigApi.data)
        }
    }, [getConfigApi.data])

    const handleChange = (event, newValue) => {
        setValue(newValue)
    }

    const getCode = (codeLang) => {
        if (codeLang === 'Python') {
            return `import requests

API_URL = "${baseURL}/api/v1/prediction/${dialogProps.chatflowid}"

def query(payload):
    response = requests.post(API_URL, json=payload)
    return response.json()
    
output = query({
    "question": "Hey, how are you?",
})
`
        } else if (codeLang === 'JavaScript') {
            return `async function query(data) {
    const response = await fetch(
        "${baseURL}/api/v1/prediction/${dialogProps.chatflowid}",
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

query({"question": "Hey, how are you?"}).then((response) => {
    console.log(response);
});
`
        } else if (codeLang === 'cURL') {
            return `curl ${baseURL}/api/v1/prediction/${dialogProps.chatflowid} \\
     -X POST \\
     -d '{"question": "Hey, how are you?"}' \\
     -H "Content-Type: application/json"`
        }
        return ''
    }

    const getCodeWithAuthorization = (codeLang) => {
        if (codeLang === 'Python') {
            return `import requests

API_URL = "${baseURL}/api/v1/prediction/${dialogProps.chatflowid}"
headers = {"Authorization": "Bearer ${selectedApiKey?.apiKey}"}

def query(payload):
    response = requests.post(API_URL, headers=headers, json=payload)
    return response.json()
    
output = query({
    "question": "Hey, how are you?",
})
`
        } else if (codeLang === 'JavaScript') {
            return `async function query(data) {
    const response = await fetch(
        "${baseURL}/api/v1/prediction/${dialogProps.chatflowid}",
        {
            headers: {
                Authorization: "Bearer ${selectedApiKey?.apiKey}",
                "Content-Type": "application/json"
            },
            method: "POST",
            body: JSON.stringify(data)
        }
    );
    const result = await response.json();
    return result;
}

query({"question": "Hey, how are you?"}).then((response) => {
    console.log(response);
});
`
        } else if (codeLang === 'cURL') {
            return `curl ${baseURL}/api/v1/prediction/${dialogProps.chatflowid} \\
     -X POST \\
     -d '{"question": "Hey, how are you?"}' \\
     -H "Content-Type: application/json" \\
     -H "Authorization: Bearer ${selectedApiKey?.apiKey}"`
        }
        return ''
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

    // ----------------------------CONFIG FORM DATA --------------------------//

    const getConfigCodeWithFormData = (codeLang, configData) => {
        if (codeLang === 'Python') {
            configData = unshiftFiles(configData)
            const fileType = configData[0].type
            return `import requests

API_URL = "${baseURL}/api/v1/prediction/${dialogProps.chatflowid}"

# use form data to upload files
form_data = {
    "files": ${`('example${fileType}', open('example${fileType}', 'rb'))`}
}
body_data = {${getConfigExamplesForPython(configData, 'formData')}}

def query(form_data):
    response = requests.post(API_URL, files=form_data, data=body_data)
    return response.json()

output = query(form_data)
`
        } else if (codeLang === 'JavaScript') {
            return `// use FormData to upload files
let formData = new FormData();
${getConfigExamplesForJS(configData, 'formData')}
async function query(formData) {
    const response = await fetch(
        "${baseURL}/api/v1/prediction/${dialogProps.chatflowid}",
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
            return `curl ${baseURL}/api/v1/prediction/${dialogProps.chatflowid} \\
     -X POST \\${getConfigExamplesForCurl(configData, 'formData')} \\
     -H "Content-Type: multipart/form-data"`
        }
        return ''
    }

    // ----------------------------CONFIG FORM DATA with AUTH--------------------------//

    const getConfigCodeWithFormDataWithAuth = (codeLang, configData) => {
        if (codeLang === 'Python') {
            configData = unshiftFiles(configData)
            const fileType = configData[0].type
            return `import requests

API_URL = "${baseURL}/api/v1/prediction/${dialogProps.chatflowid}"
headers = {"Authorization": "Bearer ${selectedApiKey?.apiKey}"}

# use form data to upload files
form_data = {
    "files": ${`('example${fileType}', open('example${fileType}', 'rb'))`}
}
body_data = {${getConfigExamplesForPython(configData, 'formData')}}

def query(form_data):
    response = requests.post(API_URL, headers=headers, files=form_data, data=body_data)
    return response.json()

output = query(form_data)
`
        } else if (codeLang === 'JavaScript') {
            return `// use FormData to upload files
let formData = new FormData();
${getConfigExamplesForJS(configData, 'formData')}
async function query(formData) {
    const response = await fetch(
        "${baseURL}/api/v1/prediction/${dialogProps.chatflowid}",
        {
            headers: { Authorization: "Bearer ${selectedApiKey?.apiKey}" },
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
            return `curl ${baseURL}/api/v1/prediction/${dialogProps.chatflowid} \\
     -X POST \\${getConfigExamplesForCurl(configData, 'formData')} \\
     -H "Content-Type: multipart/form-data" \\
     -H "Authorization: Bearer ${selectedApiKey?.apiKey}"`
        }
        return ''
    }

    // ----------------------------CONFIG JSON--------------------------//

    const getConfigCode = (codeLang, configData) => {
        if (codeLang === 'Python') {
            return `import requests

API_URL = "${baseURL}/api/v1/prediction/${dialogProps.chatflowid}"

def query(payload):
    response = requests.post(API_URL, json=payload)
    return response.json()

output = query({
    "question": "Hey, how are you?",
    "overrideConfig": {${getConfigExamplesForPython(configData, 'json')}
    }
})
`
        } else if (codeLang === 'JavaScript') {
            return `async function query(data) {
    const response = await fetch(
        "${baseURL}/api/v1/prediction/${dialogProps.chatflowid}",
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
  "question": "Hey, how are you?",
  "overrideConfig": {${getConfigExamplesForJS(configData, 'json')}
  }
}).then((response) => {
    console.log(response);
});
`
        } else if (codeLang === 'cURL') {
            return `curl ${baseURL}/api/v1/prediction/${dialogProps.chatflowid} \\
     -X POST \\
     -d '{"question": "Hey, how are you?", "overrideConfig": {${getConfigExamplesForCurl(configData, 'json')}}' \\
     -H "Content-Type: application/json"`
        }
        return ''
    }

    // ----------------------------CONFIG JSON with AUTH--------------------------//

    const getConfigCodeWithAuthorization = (codeLang, configData) => {
        if (codeLang === 'Python') {
            return `import requests

API_URL = "${baseURL}/api/v1/prediction/${dialogProps.chatflowid}"
headers = {"Authorization": "Bearer ${selectedApiKey?.apiKey}"}

def query(payload):
    response = requests.post(API_URL, headers=headers, json=payload)
    return response.json()

output = query({
    "question": "Hey, how are you?",
    "overrideConfig": {${getConfigExamplesForPython(configData, 'json')}
    }
})
`
        } else if (codeLang === 'JavaScript') {
            return `async function query(data) {
    const response = await fetch(
        "${baseURL}/api/v1/prediction/${dialogProps.chatflowid}",
        {
            headers: {
                Authorization: "Bearer ${selectedApiKey?.apiKey}",
                "Content-Type": "application/json"
            },
            method: "POST",
            body: JSON.stringify(data)
        }
    );
    const result = await response.json();
    return result;
}

query({
  "question": "Hey, how are you?",
  "overrideConfig": {${getConfigExamplesForJS(configData, 'json')}
  }
}).then((response) => {
    console.log(response);
});
`
        } else if (codeLang === 'cURL') {
            return `curl ${baseURL}/api/v1/prediction/${dialogProps.chatflowid} \\
     -X POST \\
     -d '{"question": "Hey, how are you?", "overrideConfig": {${getConfigExamplesForCurl(configData, 'json')}}' \\
     -H "Content-Type: application/json" \\
     -H "Authorization: Bearer ${selectedApiKey?.apiKey}"`
        }
        return ''
    }

    const getMultiConfigCodeWithFormData = (codeLang) => {
        if (codeLang === 'Python') {
            return `body_data = {
    "openAIApiKey[chatOpenAI_0]": "sk-my-openai-1st-key",
    "openAIApiKey[openAIEmbeddings_0]": "sk-my-openai-2nd-key"
}`
        } else if (codeLang === 'JavaScript') {
            return `formData.append("openAIApiKey[chatOpenAI_0]", "sk-my-openai-1st-key")
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

    useEffect(() => {
        if (getAllAPIKeysApi.data) {
            const options = [
                {
                    label: 'No Authorization',
                    name: ''
                }
            ]
            for (const key of getAllAPIKeysApi.data) {
                options.push({
                    label: key.keyName,
                    name: key.id
                })
            }
            options.push({
                label: '- Add New Key -',
                name: 'addnewkey'
            })
            setKeyOptions(options)
            setAPIKeys(getAllAPIKeysApi.data)

            if (dialogProps.chatflowApiKeyId) {
                setChatflowApiKeyId(dialogProps.chatflowApiKeyId)
                setSelectedApiKey(getAllAPIKeysApi.data.find((key) => key.id === dialogProps.chatflowApiKeyId))
            }
        }
    }, [dialogProps, getAllAPIKeysApi.data])

    useEffect(() => {
        if (show) {
            getAllAPIKeysApi.request()
            getIsChatflowStreamingApi.request(dialogProps.chatflowid)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show])

    const component = show ? (
        <Dialog
            open={show}
            fullWidth
            maxWidth='md'
            onClose={onCancel}
            aria-labelledby='alert-dialog-title'
            aria-describedby='alert-dialog-description'
        >
            <DialogTitle sx={{ fontSize: '1rem' }} id='alert-dialog-title'>
                {dialogProps.title}
            </DialogTitle>
            <DialogContent>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                    <div style={{ flex: 80 }}>
                        <Tabs value={value} onChange={handleChange} aria-label='tabs'>
                            {codes.map((codeLang, index) => (
                                <Tab
                                    icon={
                                        <img style={{ objectFit: 'cover', height: 15, width: 'auto' }} src={getSVG(codeLang)} alt='code' />
                                    }
                                    iconPosition='start'
                                    key={index}
                                    label={codeLang}
                                    {...a11yProps(index)}
                                ></Tab>
                            ))}
                        </Tabs>
                    </div>
                    <div style={{ flex: 20 }}>
                        <Dropdown
                            name='SelectKey'
                            disableClearable={true}
                            options={keyOptions}
                            onSelect={(newValue) => onApiKeySelected(newValue)}
                            value={dialogProps.chatflowApiKeyId ?? chatflowApiKeyId ?? 'Choose an API key'}
                        />
                    </div>
                </div>
                <div style={{ marginTop: 10 }}></div>
                {codes.map((codeLang, index) => (
                    <TabPanel key={index} value={value} index={index}>
                        {(codeLang === 'Embed' || codeLang === 'Share Chatbot') && chatflowApiKeyId && (
                            <>
                                <p>You cannot use API key while embedding/sharing chatbot.</p>
                                <p>
                                    Please select <b>&quot;No Authorization&quot;</b> from the dropdown at the top right corner.
                                </p>
                            </>
                        )}
                        {codeLang === 'Embed' && !chatflowApiKeyId && <EmbedChat chatflowid={dialogProps.chatflowid} />}
                        {codeLang !== 'Embed' && codeLang !== 'Share Chatbot' && codeLang !== 'Configuration' && (
                            <>
                                <CopyBlock
                                    theme={atomOneDark}
                                    text={chatflowApiKeyId ? getCodeWithAuthorization(codeLang) : getCode(codeLang)}
                                    language={getLang(codeLang)}
                                    showLineNumbers={false}
                                    wrapLines
                                />
                                <CheckboxInput label='Show Input Config' value={checkboxVal} onChange={onCheckBoxChanged} />
                                {checkboxVal && getConfigApi.data && getConfigApi.data.length > 0 && (
                                    <>
                                        {Object.keys(nodeConfig)
                                            .sort()
                                            .map((nodeLabel) => (
                                                <Accordion
                                                    expanded={nodeConfigExpanded[nodeLabel] || false}
                                                    onChange={handleAccordionChange(nodeLabel)}
                                                    key={nodeLabel}
                                                    disableGutters
                                                >
                                                    <AccordionSummary
                                                        expandIcon={<ExpandMoreIcon />}
                                                        aria-controls={`nodes-accordian-${nodeLabel}`}
                                                        id={`nodes-accordian-header-${nodeLabel}`}
                                                    >
                                                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                                                            <Typography variant='h5'>{nodeLabel}</Typography>
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
                                                                    {nodeConfig[nodeLabel][0].nodeId}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </AccordionSummary>
                                                    <AccordionDetails>
                                                        <TableViewOnly
                                                            rows={nodeConfig[nodeLabel]}
                                                            columns={Object.keys(nodeConfig[nodeLabel][0]).slice(-3)}
                                                        />
                                                    </AccordionDetails>
                                                </Accordion>
                                            ))}
                                        <CopyBlock
                                            theme={atomOneDark}
                                            text={
                                                chatflowApiKeyId
                                                    ? dialogProps.isFormDataRequired
                                                        ? getConfigCodeWithFormDataWithAuth(codeLang, getConfigApi.data)
                                                        : getConfigCodeWithAuthorization(codeLang, getConfigApi.data)
                                                    : dialogProps.isFormDataRequired
                                                    ? getConfigCodeWithFormData(codeLang, getConfigApi.data)
                                                    : getConfigCode(codeLang, getConfigApi.data)
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
                                                    You can also specify multiple values for a config parameter by specifying the node id
                                                </span>
                                            </div>
                                            <div style={{ padding: 10 }}>
                                                <CopyBlock
                                                    theme={atomOneDark}
                                                    text={
                                                        dialogProps.isFormDataRequired
                                                            ? getMultiConfigCodeWithFormData(codeLang)
                                                            : getMultiConfigCode()
                                                    }
                                                    language={getLang(codeLang)}
                                                    showLineNumbers={false}
                                                    wrapLines
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}
                                {getIsChatflowStreamingApi.data?.isStreaming && (
                                    <p>
                                        Read&nbsp;
                                        <a rel='noreferrer' target='_blank' href='https://docs.flowiseai.com/how-to-use#streaming'>
                                            here
                                        </a>
                                        &nbsp;on how to stream response back to application
                                    </p>
                                )}
                            </>
                        )}
                        {codeLang === 'Share Chatbot' && !chatflowApiKeyId && (
                            <ShareChatbot isSessionMemory={dialogProps.isSessionMemory} />
                        )}
                        {codeLang === 'Configuration' && <Configuration />}
                    </TabPanel>
                ))}
            </DialogContent>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

APICodeDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func
}

export default APICodeDialog
