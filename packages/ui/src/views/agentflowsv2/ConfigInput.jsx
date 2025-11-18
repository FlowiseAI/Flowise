import { useContext, useState, useEffect, useMemo } from 'react'
import PropTypes from 'prop-types'
import { cloneDeep } from 'lodash'

// Material
import { Accordion, AccordionSummary, AccordionDetails, Box, Typography, Tooltip, IconButton } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { IconSettings, IconAlertTriangle } from '@tabler/icons-react'

// Project imports
import NodeInputHandler from '../canvas/NodeInputHandler'

// API
import nodesApi from '@/api/nodes'

// const
import { initNode, showHideInputParams, initializeDefaultNodeData } from '@/utils/genericHelper'
import { flowContext } from '@/store/context/ReactFlowContext'
import { FLOWISE_CREDENTIAL_ID } from '@/store/constant'

export const ConfigInput = ({ data, inputParam, disabled = false, arrayIndex = null, parentParamForArray = null }) => {
    const theme = useTheme()
    const { reactFlowInstance } = useContext(flowContext)

    const [expanded, setExpanded] = useState(false)
    const [selectedComponentNodeData, setSelectedComponentNodeData] = useState({})

    // Track the last processed input values to prevent infinite loops using useState
    const [lastProcessedInputs, setLastProcessedInputs] = useState({
        mainValue: null,
        configValue: null,
        arrayValue: null
    })

    const handleAccordionChange = (event, isExpanded) => {
        setExpanded(isExpanded)
    }

    const onCustomDataChange = ({ inputParam, newValue }) => {
        let nodeData = cloneDeep(selectedComponentNodeData)

        const updatedInputs = { ...nodeData.inputs }
        updatedInputs[inputParam.name] = newValue

        const updatedInputParams = showHideInputParams({
            ...nodeData,
            inputs: updatedInputs
        })

        // Remove inputs with display set to false
        Object.keys(updatedInputs).forEach((key) => {
            const input = updatedInputParams.find((param) => param.name === key)
            if (input && input.display === false) {
                delete updatedInputs[key]
            }
        })

        const credential = updatedInputs.credential || updatedInputs[FLOWISE_CREDENTIAL_ID]

        nodeData = {
            ...nodeData,
            inputParams: updatedInputParams,
            inputs: updatedInputs,
            credential: credential ? credential : undefined
        }

        setSelectedComponentNodeData(nodeData)
    }

    // Memoize current input values for reliable comparison
    const currentInputValues = useMemo(
        () => ({
            mainValue: data.inputs[inputParam.name],
            configValue: data.inputs[`${inputParam.name}Config`],
            arrayValue: parentParamForArray ? data.inputs[parentParamForArray.name] : null
        }),

        // eslint-disable-next-line react-hooks/exhaustive-deps
        [data.inputs, inputParam.name, parentParamForArray?.name]
    )

    // Load initial component data when the component mounts
    useEffect(() => {
        const loadComponentData = async () => {
            // Get the node name from inputs
            const nodeName = data.inputs[inputParam.name]
            const node = await nodesApi.getSpecificNode(nodeName)

            if (!node.data) return

            // Initialize component node with basic data
            const componentNodeData = cloneDeep(initNode(node.data, `${node.data.nodeName}_0`))

            // Helper function to check if array-based configuration exists
            const isArray = () => {
                return parentParamForArray && data.inputs[parentParamForArray.name]
            }

            const hasArrayConfig = () => {
                return (
                    parentParamForArray &&
                    data.inputs[parentParamForArray.name] &&
                    Array.isArray(data.inputs[parentParamForArray.name]) &&
                    data.inputs[parentParamForArray.name][arrayIndex] &&
                    data.inputs[parentParamForArray.name][arrayIndex][`${inputParam.name}Config`]
                )
            }

            // Helper function to get current input value
            const getCurrentInputValue = () => {
                return hasArrayConfig() ? data.inputs[parentParamForArray.name][arrayIndex][inputParam.name] : data.inputs[inputParam.name]
            }

            // Helper function to get config data
            const getConfigData = () => {
                return hasArrayConfig()
                    ? data.inputs[parentParamForArray.name][arrayIndex][`${inputParam.name}Config`]
                    : data.inputs[`${inputParam.name}Config`]
            }

            // Update component inputs based on configuration
            if (hasArrayConfig() || data.inputs[`${inputParam.name}Config`]) {
                const configData = getConfigData()
                const currentValue = getCurrentInputValue()

                // If stored config value doesn't match current input, reset to defaults
                if (configData[inputParam.name] !== currentValue) {
                    const defaultInput = initializeDefaultNodeData(componentNodeData.inputParams)
                    componentNodeData.inputs = { ...defaultInput, [inputParam.name]: currentValue }
                } else {
                    // Use existing config with current input value
                    componentNodeData.inputs = { ...configData, [inputParam.name]: currentValue }
                }
            } else {
                const currentValue = isArray()
                    ? data.inputs[parentParamForArray.name][arrayIndex][inputParam.name]
                    : data.inputs[inputParam.name]
                componentNodeData.inputs = {
                    ...componentNodeData.inputs,
                    [inputParam.name]: currentValue
                }
            }

            // Update input parameters visibility based on current inputs
            componentNodeData.inputParams = showHideInputParams({
                ...componentNodeData,
                inputs: componentNodeData.inputs
            })

            const credential = componentNodeData.inputs.credential || componentNodeData.inputs[FLOWISE_CREDENTIAL_ID]
            componentNodeData.credential = credential ? credential : undefined

            setSelectedComponentNodeData(componentNodeData)

            // Store the processed inputs to track changes
            setLastProcessedInputs({
                mainValue: data.inputs[inputParam.name],
                configValue: data.inputs[`${inputParam.name}Config`],
                arrayValue: parentParamForArray ? data.inputs[parentParamForArray.name] : null
            })
        }

        loadComponentData()

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Handle external changes to data.inputs
    useEffect(() => {
        if (!selectedComponentNodeData.inputParams) return

        // Check if relevant inputs have changed using strict equality comparison
        const hasMainValueChanged = lastProcessedInputs.mainValue !== currentInputValues.mainValue
        const hasConfigValueChanged = lastProcessedInputs.configValue !== currentInputValues.configValue
        const hasArrayValueChanged = lastProcessedInputs.arrayValue !== currentInputValues.arrayValue

        if (!hasMainValueChanged && !hasConfigValueChanged && !hasArrayValueChanged) {
            return // No relevant changes
        }

        // Update selectedComponentNodeData with new input values
        const updateComponentData = () => {
            const updatedComponentData = cloneDeep(selectedComponentNodeData)

            // Helper functions (same as in initial load)
            const hasArrayConfig = () => {
                return (
                    parentParamForArray &&
                    data.inputs[parentParamForArray.name] &&
                    Array.isArray(data.inputs[parentParamForArray.name]) &&
                    data.inputs[parentParamForArray.name][arrayIndex] &&
                    data.inputs[parentParamForArray.name][arrayIndex][`${inputParam.name}Config`]
                )
            }

            const getCurrentInputValue = () => {
                return hasArrayConfig() ? data.inputs[parentParamForArray.name][arrayIndex][inputParam.name] : data.inputs[inputParam.name]
            }

            const getConfigData = () => {
                return hasArrayConfig()
                    ? data.inputs[parentParamForArray.name][arrayIndex][`${inputParam.name}Config`]
                    : data.inputs[`${inputParam.name}Config`]
            }

            // Update the main input value in component data
            const currentValue = getCurrentInputValue()
            if (currentValue !== undefined) {
                updatedComponentData.inputs[inputParam.name] = currentValue
            }

            // If there's config data and it matches the current value, use it
            if (hasArrayConfig() || data.inputs[`${inputParam.name}Config`]) {
                const configData = getConfigData()
                if (configData && configData[inputParam.name] === currentValue) {
                    // Config is still valid, merge it with current value
                    updatedComponentData.inputs = { ...configData, [inputParam.name]: currentValue }
                } else if (hasMainValueChanged) {
                    // Main value changed but config doesn't match, reset to defaults with new value
                    const defaultInput = initializeDefaultNodeData(updatedComponentData.inputParams)
                    updatedComponentData.inputs = { ...defaultInput, [inputParam.name]: currentValue }
                }
            }

            // Update input parameters visibility
            updatedComponentData.inputParams = showHideInputParams({
                ...updatedComponentData,
                inputs: updatedComponentData.inputs
            })

            const credential = updatedComponentData.inputs.credential || updatedComponentData.inputs[FLOWISE_CREDENTIAL_ID]
            updatedComponentData.credential = credential ? credential : undefined

            setSelectedComponentNodeData(updatedComponentData)

            // Update the tracked values
            setLastProcessedInputs({
                mainValue: currentInputValues.mainValue,
                configValue: currentInputValues.configValue,
                arrayValue: currentInputValues.arrayValue
            })
        }

        updateComponentData()

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentInputValues, selectedComponentNodeData.inputParams, inputParam.name, parentParamForArray?.name, arrayIndex])

    // Update node configuration when selected component data changes
    useEffect(() => {
        if (!selectedComponentNodeData.inputs) return

        reactFlowInstance.setNodes((nds) =>
            nds.map((node) => {
                if (node.id !== data.id) return node

                // Handle array-based configuration
                if (arrayIndex !== null && parentParamForArray) {
                    // Initialize array if it doesn't exist
                    if (!node.data.inputs[parentParamForArray.name]) {
                        node.data.inputs[parentParamForArray.name] = []
                    }
                    // Initialize array element if it doesn't exist
                    if (!node.data.inputs[parentParamForArray.name][arrayIndex]) {
                        node.data.inputs[parentParamForArray.name][arrayIndex] = {}
                    }
                    // Store config in array
                    node.data.inputs[parentParamForArray.name][arrayIndex][`${inputParam.name}Config`] = selectedComponentNodeData.inputs
                } else {
                    // Store config directly
                    node.data.inputs[`${inputParam.name}Config`] = selectedComponentNodeData.inputs
                }
                return node
            })
        )

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedComponentNodeData])

    return (
        <>
            <Box
                sx={{
                    p: 0,
                    mt: 1,
                    mb: 1,
                    border: 1,
                    borderColor: theme.palette.grey[900] + 25,
                    borderRadius: 2
                }}
            >
                <Accordion sx={{ background: 'transparent' }} expanded={expanded} onChange={handleAccordionChange}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ background: 'transparent' }}>
                        <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                            <IconSettings stroke={1.5} size='1.3rem' />
                            <Typography sx={{ ml: 1 }}>{selectedComponentNodeData?.label} Parameters</Typography>
                            <div style={{ flexGrow: 1 }}></div>
                            {selectedComponentNodeData?.warning && (
                                <Tooltip
                                    title={<span style={{ whiteSpace: 'pre-line' }}>{selectedComponentNodeData.warning}</span>}
                                    placement='top'
                                >
                                    <IconButton sx={{ height: 35, width: 35 }}>
                                        <IconAlertTriangle size={20} color='orange' />
                                    </IconButton>
                                </Tooltip>
                            )}
                        </div>
                    </AccordionSummary>
                    <AccordionDetails>
                        {(selectedComponentNodeData.inputParams ?? [])
                            .filter((inputParam) => !inputParam.hidden)
                            .filter((inputParam) => inputParam.display !== false)
                            .map((inputParam, index) => (
                                <NodeInputHandler
                                    disabled={disabled}
                                    key={index}
                                    inputParam={inputParam}
                                    data={selectedComponentNodeData}
                                    isAdditionalParams={true}
                                    onCustomDataChange={onCustomDataChange}
                                />
                            ))}
                    </AccordionDetails>
                </Accordion>
            </Box>
        </>
    )
}

ConfigInput.propTypes = {
    name: PropTypes.string,
    inputParam: PropTypes.object,
    data: PropTypes.object,
    disabled: PropTypes.bool,
    arrayIndex: PropTypes.number,
    parentParamForArray: PropTypes.object
}
