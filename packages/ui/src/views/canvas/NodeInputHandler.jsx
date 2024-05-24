import PropTypes from 'prop-types'
import { Handle, Position, useUpdateNodeInternals } from 'reactflow'
import { useEffect, useRef, useState, useContext } from 'react'
import { useSelector } from 'react-redux'

// material-ui
import { useTheme, styled } from '@mui/material/styles'
import { Box, Typography, Tooltip, IconButton, Button } from '@mui/material'
import IconAutoFixHigh from '@mui/icons-material/AutoFixHigh'
import { tooltipClasses } from '@mui/material/Tooltip'
import { IconArrowsMaximize, IconEdit, IconAlertTriangle } from '@tabler/icons-react'

// project import
import { Dropdown } from '@/ui-component/dropdown/Dropdown'
import { MultiDropdown } from '@/ui-component/dropdown/MultiDropdown'
import { AsyncDropdown } from '@/ui-component/dropdown/AsyncDropdown'
import { Input } from '@/ui-component/input/Input'
import { DataGrid } from '@/ui-component/grid/DataGrid'
import { File } from '@/ui-component/file/File'
import { SwitchInput } from '@/ui-component/switch/Switch'
import { flowContext } from '@/store/context/ReactFlowContext'
import { isValidConnection } from '@/utils/genericHelper'
import { JsonEditorInput } from '@/ui-component/json/JsonEditor'
import { TooltipWithParser } from '@/ui-component/tooltip/TooltipWithParser'
import { CodeEditor } from '@/ui-component/editor/CodeEditor'
import ToolDialog from '@/views/tools/ToolDialog'
import AssistantDialog from '@/views/assistants/AssistantDialog'
import FormatPromptValuesDialog from '@/ui-component/dialog/FormatPromptValuesDialog'
import ExpandTextDialog from '@/ui-component/dialog/ExpandTextDialog'
import PromptLangsmithHubDialog from '@/ui-component/dialog/PromptLangsmithHubDialog'
import ManageScrapedLinksDialog from '@/ui-component/dialog/ManageScrapedLinksDialog'
import CredentialInputHandler from './CredentialInputHandler'

// utils
import { getInputVariables } from '@/utils/genericHelper'

// const
import { FLOWISE_CREDENTIAL_ID } from '@/store/constant'

const EDITABLE_OPTIONS = ['selectedTool', 'selectedAssistant']

const CustomWidthTooltip = styled(({ className, ...props }) => <Tooltip {...props} classes={{ popper: className }} />)({
    [`& .${tooltipClasses.tooltip}`]: {
        maxWidth: 500
    }
})

// ===========================|| NodeInputHandler ||=========================== //

const NodeInputHandler = ({ inputAnchor, inputParam, data, disabled = false, isAdditionalParams = false }) => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    const ref = useRef(null)
    const { reactFlowInstance } = useContext(flowContext)
    const updateNodeInternals = useUpdateNodeInternals()
    const [position, setPosition] = useState(0)
    const [showExpandDialog, setShowExpandDialog] = useState(false)
    const [expandDialogProps, setExpandDialogProps] = useState({})
    const [showAsyncOptionDialog, setAsyncOptionEditDialog] = useState('')
    const [asyncOptionEditDialogProps, setAsyncOptionEditDialogProps] = useState({})
    const [reloadTimestamp, setReloadTimestamp] = useState(Date.now().toString())
    const [showFormatPromptValuesDialog, setShowFormatPromptValuesDialog] = useState(false)
    const [formatPromptValuesDialogProps, setFormatPromptValuesDialogProps] = useState({})
    const [showPromptHubDialog, setShowPromptHubDialog] = useState(false)
    const [showManageScrapedLinksDialog, setShowManageScrapedLinksDialog] = useState(false)
    const [manageScrapedLinksDialogProps, setManageScrapedLinksDialogProps] = useState({})

    const onExpandDialogClicked = (value, inputParam) => {
        const dialogProps = {
            value,
            inputParam,
            disabled,
            confirmButtonName: 'Save',
            cancelButtonName: 'Cancel'
        }
        setExpandDialogProps(dialogProps)
        setShowExpandDialog(true)
    }

    const onShowPromptHubButtonClicked = () => {
        setShowPromptHubDialog(true)
    }

    const onShowPromptHubButtonSubmit = (templates) => {
        setShowPromptHubDialog(false)
        for (const t of templates) {
            if (Object.prototype.hasOwnProperty.call(data.inputs, t.type)) {
                data.inputs[t.type] = t.template
            }
        }
    }

    const onManageLinksDialogClicked = (url, selectedLinks, relativeLinksMethod, limit) => {
        const dialogProps = {
            url,
            relativeLinksMethod,
            limit,
            selectedLinks,
            confirmButtonName: 'Save',
            cancelButtonName: 'Cancel'
        }
        setManageScrapedLinksDialogProps(dialogProps)
        setShowManageScrapedLinksDialog(true)
    }

    const onManageLinksDialogSave = (url, links) => {
        setShowManageScrapedLinksDialog(false)
        data.inputs.url = url
        data.inputs.selectedLinks = links
    }

    const getJSONValue = (templateValue) => {
        if (!templateValue) return ''
        const obj = {}
        const inputVariables = getInputVariables(templateValue)
        for (const inputVariable of inputVariables) {
            obj[inputVariable] = ''
        }
        if (Object.keys(obj).length) return JSON.stringify(obj)
        return ''
    }

    const onEditJSONClicked = (value, inputParam) => {
        // Preset values if the field is format prompt values
        let inputValue = value
        if (inputParam.name === 'promptValues' && !value) {
            const templateValue =
                (data.inputs['template'] ?? '') +
                (data.inputs['systemMessagePrompt'] ?? '') +
                (data.inputs['humanMessagePrompt'] ?? '') +
                (data.inputs['workerPrompt'] ?? '')
            inputValue = getJSONValue(templateValue)
        }
        const dialogProp = {
            value: inputValue,
            inputParam,
            nodes: reactFlowInstance.getNodes(),
            edges: reactFlowInstance.getEdges(),
            nodeId: data.id
        }
        setFormatPromptValuesDialogProps(dialogProp)
        setShowFormatPromptValuesDialog(true)
    }

    const onExpandDialogSave = (newValue, inputParamName) => {
        setShowExpandDialog(false)
        data.inputs[inputParamName] = newValue
    }

    const editAsyncOption = (inputParamName, inputValue) => {
        if (inputParamName === 'selectedTool') {
            setAsyncOptionEditDialogProps({
                title: 'Edit Tool',
                type: 'EDIT',
                cancelButtonName: 'Cancel',
                confirmButtonName: 'Save',
                toolId: inputValue
            })
        } else if (inputParamName === 'selectedAssistant') {
            setAsyncOptionEditDialogProps({
                title: 'Edit Assistant',
                type: 'EDIT',
                cancelButtonName: 'Cancel',
                confirmButtonName: 'Save',
                assistantId: inputValue
            })
        }
        setAsyncOptionEditDialog(inputParamName)
    }

    const addAsyncOption = (inputParamName) => {
        if (inputParamName === 'selectedTool') {
            setAsyncOptionEditDialogProps({
                title: 'Add New Tool',
                type: 'ADD',
                cancelButtonName: 'Cancel',
                confirmButtonName: 'Add'
            })
        } else if (inputParamName === 'selectedAssistant') {
            setAsyncOptionEditDialogProps({
                title: 'Add New Assistant',
                type: 'ADD',
                cancelButtonName: 'Cancel',
                confirmButtonName: 'Add'
            })
        }
        setAsyncOptionEditDialog(inputParamName)
    }

    const onConfirmAsyncOption = (selectedOptionId = '') => {
        if (!selectedOptionId) {
            data.inputs[showAsyncOptionDialog] = ''
        } else {
            data.inputs[showAsyncOptionDialog] = selectedOptionId
            setReloadTimestamp(Date.now().toString())
        }
        setAsyncOptionEditDialogProps({})
        setAsyncOptionEditDialog('')
    }

    useEffect(() => {
        if (ref.current && ref.current.offsetTop && ref.current.clientHeight) {
            setPosition(ref.current.offsetTop + ref.current.clientHeight / 2)
            updateNodeInternals(data.id)
        }
    }, [data.id, ref, updateNodeInternals])

    useEffect(() => {
        updateNodeInternals(data.id)
    }, [data.id, position, updateNodeInternals])

    return (
        <div ref={ref}>
            {inputAnchor && (
                <>
                    <CustomWidthTooltip placement='left' title={inputAnchor.type}>
                        <Handle
                            type='target'
                            position={Position.Left}
                            key={inputAnchor.id}
                            id={inputAnchor.id}
                            isValidConnection={(connection) => isValidConnection(connection, reactFlowInstance)}
                            style={{
                                height: 10,
                                width: 10,
                                backgroundColor: data.selected ? theme.palette.primary.main : theme.palette.text.secondary,
                                top: position
                            }}
                        />
                    </CustomWidthTooltip>
                    <Box sx={{ p: 2 }}>
                        <Typography>
                            {inputAnchor.label}
                            {!inputAnchor.optional && <span style={{ color: 'red' }}>&nbsp;*</span>}
                            {inputAnchor.description && <TooltipWithParser style={{ marginLeft: 10 }} title={inputAnchor.description} />}
                        </Typography>
                    </Box>
                </>
            )}

            {((inputParam && !inputParam.additionalParams) || isAdditionalParams) && (
                <>
                    {inputParam.acceptVariable && (
                        <CustomWidthTooltip placement='left' title={inputParam.type}>
                            <Handle
                                type='target'
                                position={Position.Left}
                                key={inputParam.id}
                                id={inputParam.id}
                                isValidConnection={(connection) => isValidConnection(connection, reactFlowInstance)}
                                style={{
                                    height: 10,
                                    width: 10,
                                    backgroundColor: data.selected ? theme.palette.primary.main : theme.palette.text.secondary,
                                    top: position
                                }}
                            />
                        </CustomWidthTooltip>
                    )}
                    <Box sx={{ p: 2 }}>
                        {(data.name === 'promptTemplate' || data.name === 'chatPromptTemplate') &&
                            (inputParam.name === 'template' || inputParam.name === 'systemMessagePrompt') && (
                                <>
                                    <Button
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'row',
                                            width: '100%'
                                        }}
                                        disabled={disabled}
                                        sx={{ borderRadius: 25, width: '100%', mb: 2, mt: 0 }}
                                        variant='outlined'
                                        onClick={() => onShowPromptHubButtonClicked()}
                                        endIcon={<IconAutoFixHigh />}
                                    >
                                        Langchain Hub
                                    </Button>
                                    <PromptLangsmithHubDialog
                                        promptType={inputParam.name}
                                        show={showPromptHubDialog}
                                        onCancel={() => setShowPromptHubDialog(false)}
                                        onSubmit={onShowPromptHubButtonSubmit}
                                    ></PromptLangsmithHubDialog>
                                </>
                            )}
                        <div style={{ display: 'flex', flexDirection: 'row' }}>
                            <Typography>
                                {inputParam.label}
                                {!inputParam.optional && <span style={{ color: 'red' }}>&nbsp;*</span>}
                                {inputParam.description && <TooltipWithParser style={{ marginLeft: 10 }} title={inputParam.description} />}
                            </Typography>
                            <div style={{ flexGrow: 1 }}></div>
                            {((inputParam.type === 'string' && inputParam.rows) || inputParam.type === 'code') && (
                                <IconButton
                                    size='small'
                                    sx={{
                                        height: 25,
                                        width: 25
                                    }}
                                    title='Expand'
                                    color='primary'
                                    onClick={() =>
                                        onExpandDialogClicked(data.inputs[inputParam.name] ?? inputParam.default ?? '', inputParam)
                                    }
                                >
                                    <IconArrowsMaximize />
                                </IconButton>
                            )}
                        </div>
                        {inputParam.warning && (
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    borderRadius: 10,
                                    background: 'rgb(254,252,191)',
                                    padding: 10,
                                    marginTop: 10,
                                    marginBottom: 10
                                }}
                            >
                                <IconAlertTriangle size={30} color='orange' />
                                <span style={{ color: 'rgb(116,66,16)', marginLeft: 10 }}>{inputParam.warning}</span>
                            </div>
                        )}
                        {inputParam.type === 'credential' && (
                            <CredentialInputHandler
                                disabled={disabled}
                                data={data}
                                inputParam={inputParam}
                                onSelect={(newValue) => {
                                    data.credential = newValue
                                    data.inputs[FLOWISE_CREDENTIAL_ID] = newValue // in case data.credential is not updated
                                }}
                            />
                        )}

                        {inputParam.type === 'file' && (
                            <File
                                disabled={disabled}
                                fileType={inputParam.fileType || '*'}
                                onChange={(newValue) => (data.inputs[inputParam.name] = newValue)}
                                value={data.inputs[inputParam.name] ?? inputParam.default ?? 'Choose a file to upload'}
                            />
                        )}
                        {inputParam.type === 'boolean' && (
                            <SwitchInput
                                disabled={disabled}
                                onChange={(newValue) => (data.inputs[inputParam.name] = newValue)}
                                value={data.inputs[inputParam.name] ?? inputParam.default ?? false}
                            />
                        )}
                        {inputParam.type === 'datagrid' && (
                            <DataGrid
                                disabled={disabled}
                                columns={inputParam.datagrid}
                                hideFooter={true}
                                rows={data.inputs[inputParam.name] ?? JSON.stringify(inputParam.default) ?? []}
                                onChange={(newValue) => (data.inputs[inputParam.name] = newValue)}
                            />
                        )}
                        {inputParam.type === 'code' && (
                            <>
                                <div style={{ height: '5px' }}></div>
                                <div style={{ height: inputParam.rows ? '100px' : '200px' }}>
                                    <CodeEditor
                                        disabled={disabled}
                                        value={data.inputs[inputParam.name] ?? inputParam.default ?? ''}
                                        height={inputParam.rows ? '100px' : '200px'}
                                        theme={customization.isDarkMode ? 'dark' : 'light'}
                                        lang={'js'}
                                        placeholder={inputParam.placeholder}
                                        onValueChange={(code) => (data.inputs[inputParam.name] = code)}
                                        basicSetup={{ highlightActiveLine: false, highlightActiveLineGutter: false }}
                                    />
                                </div>
                            </>
                        )}
                        {(inputParam.type === 'string' || inputParam.type === 'password' || inputParam.type === 'number') && (
                            <Input
                                key={data.inputs[inputParam.name]}
                                disabled={disabled}
                                inputParam={inputParam}
                                onChange={(newValue) => (data.inputs[inputParam.name] = newValue)}
                                value={data.inputs[inputParam.name] ?? inputParam.default ?? ''}
                                nodes={inputParam?.acceptVariable && reactFlowInstance ? reactFlowInstance.getNodes() : []}
                                edges={inputParam?.acceptVariable && reactFlowInstance ? reactFlowInstance.getEdges() : []}
                                nodeId={data.id}
                            />
                        )}
                        {inputParam.type === 'json' && (
                            <>
                                {!inputParam?.acceptVariable && (
                                    <JsonEditorInput
                                        disabled={disabled}
                                        onChange={(newValue) => (data.inputs[inputParam.name] = newValue)}
                                        value={
                                            data.inputs[inputParam.name] ||
                                            inputParam.default ||
                                            getJSONValue(data.inputs['workerPrompt']) ||
                                            ''
                                        }
                                        isDarkMode={customization.isDarkMode}
                                    />
                                )}
                                {inputParam?.acceptVariable && (
                                    <>
                                        <Button
                                            sx={{
                                                borderRadius: 25,
                                                width: '100%',
                                                mb: 0,
                                                mt: 2
                                            }}
                                            variant='outlined'
                                            disabled={disabled}
                                            onClick={() => onEditJSONClicked(data.inputs[inputParam.name] ?? '', inputParam)}
                                        >
                                            {inputParam.label}
                                        </Button>
                                        <FormatPromptValuesDialog
                                            show={showFormatPromptValuesDialog}
                                            dialogProps={formatPromptValuesDialogProps}
                                            onCancel={() => setShowFormatPromptValuesDialog(false)}
                                            onChange={(newValue) => (data.inputs[inputParam.name] = newValue)}
                                        ></FormatPromptValuesDialog>
                                    </>
                                )}
                            </>
                        )}
                        {inputParam.type === 'options' && (
                            <Dropdown
                                disabled={disabled}
                                name={inputParam.name}
                                options={inputParam.options}
                                onSelect={(newValue) => (data.inputs[inputParam.name] = newValue)}
                                value={data.inputs[inputParam.name] ?? inputParam.default ?? 'choose an option'}
                            />
                        )}
                        {inputParam.type === 'multiOptions' && (
                            <MultiDropdown
                                disabled={disabled}
                                name={inputParam.name}
                                options={inputParam.options}
                                onSelect={(newValue) => (data.inputs[inputParam.name] = newValue)}
                                value={data.inputs[inputParam.name] ?? inputParam.default ?? 'choose an option'}
                            />
                        )}
                        {inputParam.type === 'asyncOptions' && (
                            <>
                                {data.inputParams.length === 1 && <div style={{ marginTop: 10 }} />}
                                <div key={reloadTimestamp} style={{ display: 'flex', flexDirection: 'row' }}>
                                    <AsyncDropdown
                                        disabled={disabled}
                                        name={inputParam.name}
                                        nodeData={data}
                                        value={data.inputs[inputParam.name] ?? inputParam.default ?? 'choose an option'}
                                        isCreateNewOption={EDITABLE_OPTIONS.includes(inputParam.name)}
                                        onSelect={(newValue) => (data.inputs[inputParam.name] = newValue)}
                                        onCreateNew={() => addAsyncOption(inputParam.name)}
                                    />
                                    {EDITABLE_OPTIONS.includes(inputParam.name) && data.inputs[inputParam.name] && (
                                        <IconButton
                                            title='Edit'
                                            color='primary'
                                            size='small'
                                            onClick={() => editAsyncOption(inputParam.name, data.inputs[inputParam.name])}
                                        >
                                            <IconEdit />
                                        </IconButton>
                                    )}
                                </div>
                            </>
                        )}
                        {(data.name === 'cheerioWebScraper' ||
                            data.name === 'puppeteerWebScraper' ||
                            data.name === 'playwrightWebScraper') &&
                            inputParam.name === 'url' && (
                                <>
                                    <Button
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'row',
                                            width: '100%'
                                        }}
                                        disabled={disabled}
                                        sx={{ borderRadius: '12px', width: '100%', mt: 1 }}
                                        variant='outlined'
                                        onClick={() =>
                                            onManageLinksDialogClicked(
                                                data.inputs[inputParam.name] ?? inputParam.default ?? '',
                                                data.inputs.selectedLinks,
                                                data.inputs['relativeLinksMethod'] ?? 'webCrawl',
                                                parseInt(data.inputs['limit']) ?? 0
                                            )
                                        }
                                    >
                                        Manage Links
                                    </Button>
                                    <ManageScrapedLinksDialog
                                        show={showManageScrapedLinksDialog}
                                        dialogProps={manageScrapedLinksDialogProps}
                                        onCancel={() => setShowManageScrapedLinksDialog(false)}
                                        onSave={onManageLinksDialogSave}
                                    />
                                </>
                            )}
                    </Box>
                </>
            )}
            <ToolDialog
                show={showAsyncOptionDialog === 'selectedTool'}
                dialogProps={asyncOptionEditDialogProps}
                onCancel={() => setAsyncOptionEditDialog('')}
                onConfirm={onConfirmAsyncOption}
            ></ToolDialog>
            <AssistantDialog
                show={showAsyncOptionDialog === 'selectedAssistant'}
                dialogProps={asyncOptionEditDialogProps}
                onCancel={() => setAsyncOptionEditDialog('')}
                onConfirm={onConfirmAsyncOption}
            ></AssistantDialog>
            <ExpandTextDialog
                show={showExpandDialog}
                dialogProps={expandDialogProps}
                onCancel={() => setShowExpandDialog(false)}
                onConfirm={(newValue, inputParamName) => onExpandDialogSave(newValue, inputParamName)}
            ></ExpandTextDialog>
        </div>
    )
}

NodeInputHandler.propTypes = {
    inputAnchor: PropTypes.object,
    inputParam: PropTypes.object,
    data: PropTypes.object,
    disabled: PropTypes.bool,
    isAdditionalParams: PropTypes.bool
}

export default NodeInputHandler
