import { createPortal } from 'react-dom'
import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import rehypeMathjax from 'rehype-mathjax'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import { MemoizedReactMarkdown } from '@/ui-component/markdown/MemoizedReactMarkdown'
import { CodeBlock } from '@/ui-component/markdown/CodeBlock'
import { Typography, Stack, Card, Accordion, AccordionSummary, AccordionDetails, Dialog, DialogContent, DialogTitle } from '@mui/material'
import { TableViewOnly } from '@/ui-component/table/Table'
import documentstoreApi from '@/api/documentstore'
import useApi from '@/hooks/useApi'
import { useTheme } from '@mui/material/styles'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

const DocStoreAPIDialog = ({ show, dialogProps, onCancel }) => {
    const [nodeConfig, setNodeConfig] = useState({})
    const [values, setValues] = useState('')
    const theme = useTheme()
    const [nodeConfigExpanded, setNodeConfigExpanded] = useState({})

    const getConfigApi = useApi(documentstoreApi.getDocumentStoreConfig)

    const formDataRequest = () => {
        return `With the Upsert API, you can choose an existing document and reuse the same configuration for upserting.

\`\`\`python
import requests
import json

API_URL = "http://localhost:3000/api/v1/document-store/upsert/${dialogProps.storeId}"
API_KEY = "your_api_key_here"

# use form data to upload files
form_data = {
    "files": ('my-another-file.pdf', open('my-another-file.pdf', 'rb'))
}

body_data = {
    "docId": "${dialogProps.loaderId}",
    "metadata": {}, # Add additional metadata to the document chunks
    "replaceExisting": True, # Replace existing document with the new upserted chunks
    "splitter": json.dumps({"config":{"chunkSize":20000}}) # Override existing configuration
    # "loader": "",
    # "vectorStore": "",
    # "embedding": "",
    # "recordManager": "",
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
formData.append("splitter", JSON.stringify({"config":{"chunkSize":20000}}));
// Add additional metadata to the document chunks
formData.append("metadata", "{}");
// Replace existing document with the new upserted chunks
formData.append("replaceExisting", "true");
// Override existing configuration
// formData.append("loader", "");
// formData.append("embedding", "");
// formData.append("vectorStore", "");
// formData.append("recordManager", "");

async function query(formData) {
    const response = await fetch(
        "http://localhost:3000/api/v1/document-store/upsert/${dialogProps.storeId}",
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
curl -X POST http://localhost:3000/api/v1/document-store/upsert/${dialogProps.storeId} \\
  -H "Authorization: Bearer <your_api_key_here>" \\
  -F "files=@<file-path>" \\
  -F "docId=${dialogProps.loaderId}" \\
  -F "splitter={"config":{"chunkSize":20000}}" \\
  -F "metadata={}" \\
  -F "replaceExisting=true" \\
  # Override existing configuration:
  # -F "loader=" \\
  # -F "embedding=" \\
  # -F "vectorStore=" \\
  # -F "recordManager="
\`\`\`
`
    }

    const jsonDataRequest = () => {
        return `With the Upsert API, you can choose an existing document and reuse the same configuration for upserting.
 
\`\`\`python
import requests

API_URL = "http://localhost:3000/api/v1/document-store/upsert/${dialogProps.storeId}"
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
})
print(output)
\`\`\`

\`\`\`javascript
async function query(data) {
    const response = await fetch(
        "http://localhost:3000/api/v1/document-store/upsert/${dialogProps.storeId}",
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
    "docId": "${dialogProps.loaderId},
    "metadata": "{}", // Add additional metadata to the document chunks
    "replaceExisting": true, // Replace existing document with the new upserted chunks
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
}).then((response) => {
    console.log(response);
});
\`\`\`

\`\`\`bash
curl -X POST http://localhost:3000/api/v1/document-store/upsert/${dialogProps.storeId} \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <your_api_key_here>" \\
  -d '{
        "docId": "${dialogProps.loaderId}",
        "metadata": "{}",
        "replaceExisting": true,
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
                <MemoizedReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeMathjax, rehypeRaw]}
                    components={{
                        code({ inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || '')
                            return !inline ? (
                                <CodeBlock
                                    isDialog={true}
                                    language={(match && match[1]) || ''}
                                    value={String(children).replace(/\n$/, '')}
                                    {...props}
                                />
                            ) : (
                                <code className={className} {...props}>
                                    {children}
                                </code>
                            )
                        }
                    }}
                >
                    {values}
                </MemoizedReactMarkdown>

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
