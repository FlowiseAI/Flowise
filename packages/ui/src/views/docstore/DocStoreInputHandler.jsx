import PropTypes from 'prop-types'
import { useState, useContext } from 'react'
import { useSelector } from 'react-redux'

// material-ui
import { Box, Typography, IconButton, Button } from '@mui/material'
import { IconArrowsMaximize, IconAlertTriangle, IconRefresh } from '@tabler/icons-react'

// project import
import { Dropdown } from '@/ui-component/dropdown/Dropdown'
import { MultiDropdown } from '@/ui-component/dropdown/MultiDropdown'
import { AsyncDropdown } from '@/ui-component/dropdown/AsyncDropdown'
import { Input } from '@/ui-component/input/Input'
import { DataGrid } from '@/ui-component/grid/DataGrid'
import { File } from '@/ui-component/file/File'
import { SwitchInput } from '@/ui-component/switch/Switch'
import { JsonEditorInput } from '@/ui-component/json/JsonEditor'
import { TooltipWithParser } from '@/ui-component/tooltip/TooltipWithParser'
import { CodeEditor } from '@/ui-component/editor/CodeEditor'
import { ArrayRenderer } from '@/ui-component/array/ArrayRenderer'
import ExpandTextDialog from '@/ui-component/dialog/ExpandTextDialog'
import ManageScrapedLinksDialog from '@/ui-component/dialog/ManageScrapedLinksDialog'
import CredentialInputHandler from '@/views/canvas/CredentialInputHandler'
import { flowContext } from '@/store/context/ReactFlowContext'

// const
import { FLOWISE_CREDENTIAL_ID } from '@/store/constant'

// ===========================|| DocStoreInputHandler ||=========================== //

const DocStoreInputHandler = ({ inputParam, data, disabled = false, onNodeDataChange }) => {
    const customization = useSelector((state) => state.customization)
    const flowContextValue = useContext(flowContext)
    const nodeDataChangeHandler = onNodeDataChange || flowContextValue?.onNodeDataChange

    const [showExpandDialog, setShowExpandDialog] = useState(false)
    const [expandDialogProps, setExpandDialogProps] = useState({})
    const [showManageScrapedLinksDialog, setShowManageScrapedLinksDialog] = useState(false)
    const [manageScrapedLinksDialogProps, setManageScrapedLinksDialogProps] = useState({})
    const [reloadTimestamp, setReloadTimestamp] = useState(Date.now().toString())

    const handleDataChange = ({ inputParam, newValue }) => {
        data.inputs[inputParam.name] = newValue
        const allowedShowHideInputTypes = ['boolean', 'asyncOptions', 'asyncMultiOptions', 'options', 'multiOptions']
        if (allowedShowHideInputTypes.includes(inputParam.type) && nodeDataChangeHandler) {
            nodeDataChangeHandler({ nodeId: data.id, inputParam, newValue })
        }
    }

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

    const onExpandDialogSave = (newValue, inputParamName) => {
        setShowExpandDialog(false)
        data.inputs[inputParamName] = newValue
    }

    const getCredential = () => {
        const credential = data.inputs.credential || data.inputs[FLOWISE_CREDENTIAL_ID]
        if (credential) {
            return { credential }
        }
        return {}
    }

    return (
        <div>
            {inputParam && (
                <>
                    <Box sx={{ p: 2 }}>
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
                                key={JSON.stringify(inputParam)}
                                disabled={disabled}
                                data={getCredential()}
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
                                onChange={(newValue) => handleDataChange({ inputParam, newValue })}
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
                                nodeId={data.id}
                            />
                        )}
                        {inputParam.type === 'json' && (
                            <JsonEditorInput
                                disabled={disabled}
                                onChange={(newValue) => (data.inputs[inputParam.name] = newValue)}
                                value={data.inputs[inputParam.name] ?? inputParam.default ?? ''}
                                isDarkMode={customization.isDarkMode}
                            />
                        )}
                        {inputParam.type === 'options' && (
                            <Dropdown
                                key={JSON.stringify(inputParam)}
                                disabled={disabled}
                                name={inputParam.name}
                                options={inputParam.options}
                                onSelect={(newValue) => handleDataChange({ inputParam, newValue })}
                                value={data.inputs[inputParam.name] ?? inputParam.default ?? 'choose an option'}
                            />
                        )}
                        {inputParam.type === 'multiOptions' && (
                            <MultiDropdown
                                key={JSON.stringify(inputParam)}
                                disabled={disabled}
                                name={inputParam.name}
                                options={inputParam.options}
                                onSelect={(newValue) => handleDataChange({ inputParam, newValue })}
                                value={data.inputs[inputParam.name] ?? inputParam.default ?? 'choose an option'}
                            />
                        )}
                        {(inputParam.type === 'asyncOptions' || inputParam.type === 'asyncMultiOptions') && (
                            <>
                                {data.inputParams?.length === 1 && <div style={{ marginTop: 10 }} />}
                                <div style={{ display: 'flex', flexDirection: 'row' }}>
                                    <div key={reloadTimestamp} style={{ flex: 1 }}>
                                        <AsyncDropdown
                                            key={JSON.stringify(inputParam)}
                                            disabled={disabled}
                                            name={inputParam.name}
                                            nodeData={data}
                                            freeSolo={inputParam.freeSolo}
                                            multiple={inputParam.type === 'asyncMultiOptions'}
                                            value={data.inputs[inputParam.name] ?? inputParam.default ?? 'choose an option'}
                                            onSelect={(newValue) => handleDataChange({ inputParam, newValue })}
                                            onCreateNew={() => addAsyncOption(inputParam.name)}
                                            fullWidth={true}
                                        />
                                    </div>
                                    {inputParam.refresh && (
                                        <IconButton
                                            title='Refresh'
                                            color='primary'
                                            size='small'
                                            onClick={() => setReloadTimestamp(Date.now().toString())}
                                        >
                                            <IconRefresh />
                                        </IconButton>
                                    )}
                                </div>
                            </>
                        )}
                        {inputParam.type === 'array' && (
                            <ArrayRenderer inputParam={inputParam} data={data} disabled={disabled} isDocStore={true} />
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
            <ExpandTextDialog
                show={showExpandDialog}
                dialogProps={expandDialogProps}
                onCancel={() => setShowExpandDialog(false)}
                onConfirm={(newValue, inputParamName) => onExpandDialogSave(newValue, inputParamName)}
            ></ExpandTextDialog>
        </div>
    )
}

DocStoreInputHandler.propTypes = {
    inputParam: PropTypes.object,
    data: PropTypes.object,
    disabled: PropTypes.bool,
    onNodeDataChange: PropTypes.func
}

export default DocStoreInputHandler
