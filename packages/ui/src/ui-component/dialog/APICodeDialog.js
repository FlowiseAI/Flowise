import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import PropTypes from 'prop-types'

import { Tabs, Tab, Dialog, DialogContent, DialogTitle, Box } from '@mui/material'
import { CopyBlock, atomOneDark } from 'react-code-blocks'

// Project import
import { Dropdown } from 'ui-component/dropdown/Dropdown'

// Const
import { baseURL } from 'store/constant'
import { SET_CHATFLOW } from 'store/actions'

// Images
import pythonSVG from 'assets/images/python.svg'
import javascriptSVG from 'assets/images/javascript.svg'
import cURLSVG from 'assets/images/cURL.svg'

// API
import apiKeyApi from 'api/apikey'
import chatflowsApi from 'api/chatflows'
import configApi from 'api/config'

// Hooks
import useApi from 'hooks/useApi'
import { CheckboxInput } from 'ui-component/checkbox/Checkbox'
import { TableViewOnly } from 'ui-component/table/Table'

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

const getFormDataExamplesForJS = (configData) => {
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
        finalStr += `formData.append("${config.name}", ${exampleVal})\n`
    }
    return finalStr
}

const getFormDataExamplesForPython = (configData) => {
    let finalStr = ''
    configData = unshiftFiles(configData)
    const loop = Math.min(configData.length, 4)
    for (let i = 0; i < loop; i += 1) {
        const config = configData[i]
        let exampleVal = `"example"`
        if (config.type === 'string') exampleVal = `"example"`
        else if (config.type === 'boolean') exampleVal = `true`
        else if (config.type === 'number') exampleVal = `1`
        else if (config.name === 'files') exampleVal = `('example${config.type}', open('example${config.type}', 'rb'))`
        finalStr += `\n    "${config.name}": ${exampleVal}`
        if (i === loop - 1) finalStr += `\n`
    }
    return finalStr
}

const getFormDataExamplesForCurl = (configData) => {
    let finalStr = ''
    configData = unshiftFiles(configData)
    const loop = Math.min(configData.length, 4)
    for (let i = 0; i < loop; i += 1) {
        const config = configData[i]
        let exampleVal = `example`
        if (config.type === 'string') exampleVal = `example`
        else if (config.type === 'boolean') exampleVal = `true`
        else if (config.type === 'number') exampleVal = `1`
        else if (config.name === 'files') exampleVal = `@/home/user1/Desktop/example${config.type}`
        finalStr += `\n     -F "${config.name}=${exampleVal}"`
        if (i === loop - 1) finalStr += `)\n`
        else finalStr += ` \\`
    }
    return finalStr
}

const APICodeDialog = ({ show, dialogProps, onCancel }) => {
    const portalElement = document.getElementById('portal')
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const codes = ['Python', 'JavaScript', 'cURL']
    const [value, setValue] = useState(0)
    const [keyOptions, setKeyOptions] = useState([])
    const [apiKeys, setAPIKeys] = useState([])
    const [chatflowApiKeyId, setChatflowApiKeyId] = useState('')
    const [selectedApiKey, setSelectedApiKey] = useState({})
    const [checkboxVal, setCheckbox] = useState(false)

    const getAllAPIKeysApi = useApi(apiKeyApi.getAllAPIKeys)
    const updateChatflowApi = useApi(chatflowsApi.updateChatflow)
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

    useEffect(() => {
        if (updateChatflowApi.data) {
            dispatch({ type: SET_CHATFLOW, chatflow: updateChatflowApi.data })
        }
    }, [updateChatflowApi.data, dispatch])

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
            return `async function query() {
    const response = await fetch(
        "${baseURL}/api/v1/prediction/${dialogProps.chatflowid}",
        {
            method: "POST",
            body: {
                "question": "Hey, how are you?"
            },
        }
    );
    const result = await response.json();
    return result;
}
`
        } else if (codeLang === 'cURL') {
            return `curl ${baseURL}/api/v1/prediction/${dialogProps.chatflowid} \\
     -X POST \\
     -d '{"question": "Hey, how are you?"}'`
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
            headers: { Authorization: "Bearer ${selectedApiKey?.apiKey}" },
            method: "POST",
            body: {
                "question": "Hey, how are you?"
            },
        }
    );
    const result = await response.json();
    return result;
}
`
        } else if (codeLang === 'cURL') {
            return `curl ${baseURL}/api/v1/prediction/${dialogProps.chatflowid} \\
     -X POST \\
     -d '{"question": "Hey, how are you?"}'
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
        } else if (codeLang === 'cURL') {
            return cURLSVG
        }
        return pythonSVG
    }

    const getConfigCode = (codeLang, configData) => {
        if (codeLang === 'Python') {
            return `import requests
form_data = {${getFormDataExamplesForPython(configData)}}

def setConfig():
    response = requests.post("${baseURL}/api/v1/flow-config/${dialogProps.chatflowid}", files=form_data)
    return response.json()

def query(payload):
    response = requests.post("${baseURL}/api/v1/prediction/${dialogProps.chatflowid}", json=payload)
    return response.json()

# Set initial config
config = setConfig()

# Run prediction with config
output = query({
    "question": "Hey, how are you?",
    "overrideConfig": config
})
`
        } else if (codeLang === 'JavaScript') {
            return `let formData = new FormData();
${getFormDataExamplesForJS(configData)}
async function setConfig() {
    const response = await fetch(
        "${baseURL}/api/v1/flow-config/${dialogProps.chatflowid}",
        {
            method: "POST",
            body: formData
        }
    );
    const config = await response.json();
    return config; //Returns a config object
}

async function query(config) {
    const response = await fetch(
        "${baseURL}/api/v1/prediction/${dialogProps.chatflowid}",
        {
            method: "POST",
            body: {
                "question": "Hey, how are you?",
                "overrideConfig": config
            },
        }
    );
    const result = await response.json();
    return result;
}

// Set initial config
const config = await setConfig()

// Run prediction with config
const res = await query(config)
`
        } else if (codeLang === 'cURL') {
            return `CONFIG=$(curl ${baseURL}/api/v1/flow-config/${dialogProps.chatflowid} \\
     -X POST \\${getFormDataExamplesForCurl(configData)}
curl ${baseURL}/api/v1/prediction/${dialogProps.chatflowid} \\
     -X POST \\
     -d '{"question": "Hey, how are you?", "overrideConfig": $CONFIG}'`
        }
        return ''
    }

    const getConfigCodeWithAuthorization = (codeLang, configData) => {
        if (codeLang === 'Python') {
            return `import requests
form_data = {${getFormDataExamplesForPython(configData)}}
headers = {"Authorization": "Bearer ${selectedApiKey?.apiKey}"}

def setConfig():
    response = requests.post("${baseURL}/api/v1/flow-config/${dialogProps.chatflowid}", headers=headers, files=form_data)
    return response.json()

def query(payload):
    response = requests.post("${baseURL}/api/v1/prediction/${dialogProps.chatflowid}", headers=headers, json=payload)
    return response.json()

# Set initial config
config = setConfig()

# Run prediction with config
output = query({
    "question": "Hey, how are you?",
    "overrideConfig": config
})
`
        } else if (codeLang === 'JavaScript') {
            return `let formData = new FormData();
${getFormDataExamplesForJS(configData)}
async function setConfig() {
    const response = await fetch(
        "${baseURL}/api/v1/flow-config/${dialogProps.chatflowid}",
        {
            headers: { Authorization: "Bearer ${selectedApiKey?.apiKey}" },
            method: "POST",
            body: formData
        }
    );
    const config = await response.json();
    return config; //Returns a config object
}

async function query(config) {
    const response = await fetch(
        "${baseURL}/api/v1/prediction/${dialogProps.chatflowid}",
        {
            headers: { Authorization: "Bearer ${selectedApiKey?.apiKey}" },
            method: "POST",
            body: {
                "question": "Hey, how are you?",
                "overrideConfig": config
            },
        }
    );
    const result = await response.json();
    return result;
}

// Set initial config
const config = await setConfig()

// Run prediction with config
const res = await query(config)
`
        } else if (codeLang === 'cURL') {
            return `CONFIG=$(curl ${baseURL}/api/v1/flow-config/${dialogProps.chatflowid} \\
     -X POST \\
     -H "Authorization: Bearer ${selectedApiKey?.apiKey}"\\${getFormDataExamplesForCurl(configData)}
curl ${baseURL}/api/v1/prediction/${dialogProps.chatflowid} \\
     -X POST \\
     -H "Authorization: Bearer ${selectedApiKey?.apiKey}"
     -d '{"question": "Hey, how are you?", "overrideConfig": $CONFIG}'`
        }
        return ''
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
                                        <img
                                            style={{ objectFit: 'cover', height: 'auto', width: 'auto' }}
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
                                <TableViewOnly rows={getConfigApi.data} columns={Object.keys(getConfigApi.data[0])} />
                                <CopyBlock
                                    theme={atomOneDark}
                                    text={
                                        chatflowApiKeyId
                                            ? getConfigCodeWithAuthorization(codeLang, getConfigApi.data)
                                            : getConfigCode(codeLang, getConfigApi.data)
                                    }
                                    language={getLang(codeLang)}
                                    showLineNumbers={false}
                                    wrapLines
                                />
                            </>
                        )}
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
