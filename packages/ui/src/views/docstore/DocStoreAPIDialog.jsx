import { createPortal } from 'react-dom'
import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { MemoizedReactMarkdown } from '@/ui-component/markdown/MemoizedReactMarkdown'
import {
    Typography,
    Stack,
    Card,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Dialog,
    DialogContent,
    DialogTitle,
    Box
} from '@mui/material'
import { TableViewOnly } from '@/ui-component/table/Table'
import documentstoreApi from '@/api/documentstore'
import useApi from '@/hooks/useApi'
import { useTheme } from '@mui/material/styles'
import { useSelector } from 'react-redux'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { IconInfoCircle } from '@tabler/icons-react'
import { baseURL } from '@/store/constant'

const DocStoreAPIDialog = ({ show, dialogProps, onCancel }) => {
    const [nodeConfig, setNodeConfig] = useState({})
    const [values, setValues] = useState('')
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    const [nodeConfigExpanded, setNodeConfigExpanded] = useState({})

    const getConfigApi = useApi(documentstoreApi.getDocumentStoreConfig)

    const formDataRequest = () => {
        return `With the Upsert API, you can choose an existing document and reuse the same configuration for upserting.

\`\`\`python
import requests
import json

API_URL = "${baseURL}/api/v1/document-store/upsert/${dialogProps.storeId}"
API_KEY = "your_api_key_here"

# use form data to upload files
form_data = {
    "files": ('my-another-file.pdf', open('my-another-file.pdf', 'rb'))
}

body_data = {
    "docId": "${dialogProps.loaderId}",
    "metadata": {}, # Add additional metadata to the document chunks
    "replaceExisting": True, # Replace existing document with the new upserted chunks
    "createNewDocStore": False, # Create a new document store
    "loaderName": "Custom Loader Name", # Override the loader name
    "splitter": json.dumps({"config":{"chunkSize":20000}}) # Override existing configuration
    # "loader": "",
    # "vectorStore": "",
    # "embedding": "",
    # "recordManager": "",
    # "docStore": ""
}

headers = {
    "Authorization": f"Bearer {BEARER_TOKEN}"
}

def query(form_data):
    response = requests.post(API_URL, files=form_data, data=body_data, headers=headers)
    print(response)
    return response.json()

output = query(form_data)
print(output)
\`\`\`

\`\`\`javascript
// use FormData to upload files
let formData = new FormData();
formData.append("files", input.files[0]);
formData.append("docId", "${dialogProps.loaderId}");
formData.append("loaderName", "Custom Loader Name");
formData.append("splitter", JSON.stringify({"config":{"chunkSize":20000}}));
// Add additional metadata to the document chunks
formData.append("metadata", "{}");
// Replace existing document with the new upserted chunks
formData.append("replaceExisting", "true");
// Create a new document store
formData.append("createNewDocStore", "false");
// Override existing configuration
// formData.append("loader", "");
// formData.append("embedding", "");
// formData.append("vectorStore", "");
// formData.append("recordManager", "");
// formData.append("docStore", "");

async function query(formData) {
    const response = await fetch(
        "${baseURL}/api/v1/document-store/upsert/${dialogProps.storeId}",
        {
            method: "POST",
            headers: {
                "Authorization": "Bearer <your_api_key_here>"
            },
            body: formData
        }
    );
    const result = await response.json();
    return result;
}

query(formData).then((response) => {
    console.log(response);
});
\`\`\`

\`\`\`bash
curl -X POST ${baseURL}/api/v1/document-store/upsert/${dialogProps.storeId} \\
  -H "Authorization: Bearer <your_api_key_here>" \\
  -F "files=@<file-path>" \\
  -F "docId=${dialogProps.loaderId}" \\
  -F "loaderName=Custom Loader Name" \\
  -F "splitter={"config":{"chunkSize":20000}}" \\
  -F "metadata={}" \\
  -F "replaceExisting=true" \\
  -F "createNewDocStore=false" \\
  # Override existing configuration:
  # -F "loader=" \\
  # -F "embedding=" \\
  # -F "vectorStore=" \\
  # -F "recordManager=" \\
  # -F "docStore="
\`\`\`
`
    }

    const jsonDataRequest = () => {
        return `With the Upsert API, you can choose an existing document and reuse the same configuration for upserting.
 
\`\`\`python
import requests

API_URL = "${baseURL}/api/v1/document-store/upsert/${dialogProps.storeId}"
API_KEY = "your_api_key_here"

headers = {
    "Authorization": f"Bearer {BEARER_TOKEN}"
}

def query(payload):
    response = requests.post(API_URL, json=payload, headers=headers)
    return response.json()

output = query({
    "docId": "${dialogProps.loaderId}",
    "metadata": "{}", # Add additional metadata to the document chunks
    "replaceExisting": True, # Replace existing document with the new upserted chunks
    "createNewDocStore": False, # Create a new document store
    "loaderName": "Custom Loader Name", # Override the loader name
    # Override existing configuration
    "loader": {
        "config": {
            "text": "This is a new text"
        }
    },
    "splitter": {
        "config": {
            "chunkSize": 20000
        }
    },
    # embedding: {},
    # vectorStore: {},
    # recordManager: {}
    # docStore: {}
})
print(output)
\`\`\`

\`\`\`javascript
async function query(data) {
    const response = await fetch(
        "${baseURL}/api/v1/document-store/upsert/${dialogProps.storeId}",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer <your_api_key_here>"
            },
            body: JSON.stringify(data)
        }
    );
    const result = await response.json();
    return result;
}

query({
    "docId": "${dialogProps.loaderId}",
    "metadata": "{}", // Add additional metadata to the document chunks
    "replaceExisting": true, // Replace existing document with the new upserted chunks
    "createNewDocStore": false, // Create a new document store
    "loaderName": "Custom Loader Name", // Override the loader name
    // Override existing configuration
    "loader": {
        "config": {
            "text": "This is a new text"
        }
    },
    "splitter": {
        "config": {
            "chunkSize": 20000
        }
    },
    // embedding: {},
    // vectorStore: {},
    // recordManager: {}
    // docStore: {}
}).then((response) => {
    console.log(response);
});
\`\`\`

\`\`\`bash
curl -X POST ${baseURL}/api/v1/document-store/upsert/${dialogProps.storeId} \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <your_api_key_here>" \\
  -d '{
        "docId": "${dialogProps.loaderId}",
        "metadata": "{}",
        "replaceExisting": true,
        "createNewDocStore": false,
        "loaderName": "Custom Loader Name",
        "loader": {
            "config": {
                "text": "This is a new text"
            }
        },
        "splitter": {
            "config": {
                "chunkSize": 20000
            }
        }
        // Override existing configuration
        // "embedding": {},
        // "vectorStore": {},
        // "recordManager": {}
        // "docStore": {}
      }'

\`\`\`
`
    }

    const groupByNodeLabel = (nodes) => {
        const result = {}
        const seenNodes = new Set()
        let isFormDataBody = false

        nodes.forEach((item) => {
            const { node, nodeId, label, name, type } = item
            if (name === 'files') isFormDataBody = true
            seenNodes.add(node)

            if (!result[node]) {
                result[node] = {
                    nodeIds: [],
                    params: []
                }
            }

            if (!result[node].nodeIds.includes(nodeId)) result[node].nodeIds.push(nodeId)

            const param = { label, name, type }

            if (!result[node].params.some((existingParam) => JSON.stringify(existingParam) === JSON.stringify(param))) {
                result[node].params.push(param)
            }
        })

        // Sort the nodeIds array
        for (const node in result) {
            result[node].nodeIds.sort()
        }
        setNodeConfig(result)

        if (isFormDataBody) {
            setValues(formDataRequest())
        } else {
            setValues(jsonDataRequest())
        }
    }

    const handleAccordionChange = (nodeLabel) => (event, isExpanded) => {
        const accordianNodes = { ...nodeConfigExpanded }
        accordianNodes[nodeLabel] = isExpanded
        setNodeConfigExpanded(accordianNodes)
    }

    useEffect(() => {
        if (getConfigApi.data) {
            groupByNodeLabel(getConfigApi.data)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getConfigApi.data])

    useEffect(() => {
        if (show && dialogProps) {
            getConfigApi.request(dialogProps.storeId, dialogProps.loaderId)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show, dialogProps])

    const portalElement = document.getElementById('portal')

    const component = show ? (
        <Dialog
            onClose={onCancel}
            open={show}
            fullWidth
            maxWidth='lg'
            aria-labelledby='alert-dialog-title'
            aria-describedby='alert-dialog-description'
        >
            <DialogTitle sx={{ fontSize: '1rem' }} id='alert-dialog-title'>
                {dialogProps.title}
            </DialogTitle>
            <DialogContent>
                {/* Info Box */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: 2,
                        mb: 3,
                        background: customization.isDarkMode
                            ? 'linear-gradient(135deg, rgba(33, 150, 243, 0.2) 0%, rgba(33, 150, 243, 0.1) 100%)'
                            : 'linear-gradient(135deg, rgba(33, 150, 243, 0.1) 0%, rgba(33, 150, 243, 0.05) 100%)',
                        color: customization.isDarkMode ? 'white' : '#333333',
                        fontWeight: 400,
                        borderRadius: 2,
                        border: `1px solid ${customization.isDarkMode ? 'rgba(33, 150, 243, 0.3)' : 'rgba(33, 150, 243, 0.2)'}`,
                        gap: 1.5
                    }}
                >
                    <IconInfoCircle
                        size={20}
                        style={{
                            color: customization.isDarkMode ? '#64b5f6' : '#1976d2',
                            flexShrink: 0
                        }}
                    />
                    <Box sx={{ flex: 1 }}>
                        <strong>Note:</strong> Upsert API can only be used when the existing document loader has been upserted before.
                    </Box>
                </Box>

                {/** info */}

                <MemoizedReactMarkdown>{values}</MemoizedReactMarkdown>

                <Typography sx={{ mt: 3, mb: 1 }}>You can override existing configurations:</Typography>

                <Stack direction='column' spacing={2} sx={{ width: '100%', my: 2 }}>
                    <Card sx={{ borderColor: theme.palette.primary[200] + 75, p: 2 }} variant='outlined'>
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
                                        <Stack flexDirection='row' sx={{ gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                                            <Typography variant='h5'>{nodeLabel}</Typography>
                                            {nodeConfig[nodeLabel].nodeIds.length > 0 &&
                                                nodeConfig[nodeLabel].nodeIds.map((nodeId, index) => (
                                                    <div
                                                        key={index}
                                                        style={{
                                                            display: 'flex',
                                                            flexDirection: 'row',
                                                            width: 'max-content',
                                                            borderRadius: 15,
                                                            background: 'rgb(254,252,191)',
                                                            padding: 5,
                                                            paddingLeft: 10,
                                                            paddingRight: 10
                                                        }}
                                                    >
                                                        <span
                                                            style={{
                                                                color: 'rgb(116,66,16)',
                                                                fontSize: '0.825rem'
                                                            }}
                                                        >
                                                            {nodeId}
                                                        </span>
                                                    </div>
                                                ))}
                                        </Stack>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <TableViewOnly
                                            rows={nodeConfig[nodeLabel].params.map((obj) => {
                                                // eslint-disable-next-line
                                                const { node, nodeId, ...rest } = obj
                                                return rest
                                            })}
                                            columns={Object.keys(nodeConfig[nodeLabel].params[0]).slice(-3)}
                                        />
                                    </AccordionDetails>
                                </Accordion>
                            ))}
                    </Card>
                </Stack>
            </DialogContent>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

DocStoreAPIDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func
}

export default DocStoreAPIDialog
