import { useState, useEffect, useContext } from 'react'
import { useSelector } from 'react-redux'
import PropTypes from 'prop-types'
import { Chip, Box, Button, IconButton } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { IconTrash, IconPlus, IconArrowUp, IconArrowDown } from '@tabler/icons-react'
import NodeInputHandler from '@/views/canvas/NodeInputHandler'
import DocStoreInputHandler from '@/views/docstore/DocStoreInputHandler'
import { showHideInputs } from '@/utils/genericHelper'
import { cloneDeep } from 'lodash'
import { flowContext } from '@/store/context/ReactFlowContext'

export const ArrayRenderer = ({ inputParam, data, disabled, isDocStore = false }) => {
    const [arrayItems, setArrayItems] = useState([]) // these are the actual values. Ex: [{name: 'John', age: 30}, {name: 'Jane', age: 25}]
    const [itemParameters, setItemParameters] = useState([]) // these are the input parameters for each array item. Ex: [{label: 'Name', type: 'string', display: true}, {label: 'age', type: 'number', display: false}]
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    const flowContextValue = useContext(flowContext)
    const { reactFlowInstance } = flowContextValue || {}
    const [itemKeys, setItemKeys] = useState([])

    // Enable reorder only for Condition Agent "scenarios" array.
    // Use stable schema keys (inputParam.name) instead of label to avoid i18n/text changes.
    const isConditionAgentNode = data?.name === 'conditionAgentV2' || data?.name === 'conditionAgentAgentflow'

    // Whitelist scenario field names across variants (keep this minimal)
    // Include both legacy and UI field name for compatibility
    const scenarioFieldNames = new Set(['conditionAgentScenarios', 'ConditionAgentScenarios'])

    const isScenarioField = scenarioFieldNames.has(inputParam?.name)
    const enableReorder = !isDocStore && isConditionAgentNode && isScenarioField

    //array reorder tinny tool
    const swapInArray = (arr, i, j) => {
        const next = [...arr]
        ;[next[i], next[j]] = [next[j], next[i]]
        return next
    }

    //scenario array swap function
    const moveItem = (fromIndex, toIndex) => {
        if (!enableReorder) return
        if (disabled) return
        if (fromIndex === toIndex) return

        const length = arrayItems.length
        if (length <= 0) return
        if (fromIndex < 0 || fromIndex >= length) return
        if (toIndex < 0 || toIndex >= length) return

        const nextItems = swapInArray(arrayItems, fromIndex, toIndex)
        const nextKeys = swapInArray(itemKeys, fromIndex, toIndex)

        // Only swap itemParameters when it is aligned 1:1 with arrayItems.
        // Some items may have empty parameters (show/hide), which can make lengths differ.
        const canSwapParams = itemParameters.length === arrayItems.length
        const nextParams = canSwapParams ? swapInArray(itemParameters, fromIndex, toIndex) : itemParameters

        setArrayItems(nextItems)
        if (canSwapParams) setItemParameters(nextParams)
        setItemKeys(nextKeys)

        data.inputs[inputParam.name] = nextItems

        updateOutputAnchors(nextItems, 'REORDER')
    }

    const handleMoveUp = (index) => {
        if (index <= 0) return
        moveItem(index, index - 1)
    }
    const handleMoveDown = (index) => {
        if (index >= arrayItems.length - 1) return
        moveItem(index, index + 1)
    }

    // Handler for when input values change within array items
    const handleItemInputChange = ({ inputParam: changedParam, newValue }, itemIndex) => {
        // Create deep copy to avoid mutating state directly
        let clonedData = cloneDeep(data)

        // Update the specific array item that changed
        const updatedArrayItems = [...arrayItems]
        const updatedItem = { ...updatedArrayItems[itemIndex] }

        // Reset the value of fields which has show/hide rules, so the old values don't persist
        for (let i = 0; i < inputParam.array.length; i += 1) {
            const fieldDef = inputParam.array[i]
            if (fieldDef.show || fieldDef.hide) {
                updatedItem[fieldDef.name] = fieldDef.default || ''
            }
        }

        // Set the new value for the changed field
        updatedItem[changedParam.name] = newValue
        updatedArrayItems[itemIndex] = updatedItem

        // Update local state and parent data
        setArrayItems(updatedArrayItems)
        data.inputs[inputParam.name] = updatedArrayItems
        clonedData.inputs[inputParam.name] = updatedArrayItems

        // Recalculate display parameters based on new values
        const newItemParams = showHideInputs(clonedData, 'inputParams', cloneDeep(inputParam.array), itemIndex)

        if (newItemParams.length) {
            const updatedItemParams = [...itemParameters]
            updatedItemParams[itemIndex] = newItemParams
            setItemParameters(updatedItemParams)
        }
    }

    // Initialize array items and parameters when component mounts or data changes
    useEffect(() => {
        const initialArrayItems = data.inputs[inputParam.name] || []
        setArrayItems(initialArrayItems)

        // Calculate initial display parameters for each array item
        const initialItemParameters = []
        for (let i = 0; i < initialArrayItems.length; i += 1) {
            const itemParams = showHideInputs(data, 'inputParams', cloneDeep(inputParam.array), i)
            if (itemParams.length) {
                initialItemParameters.push(itemParams)
            }
        }

        setItemParameters(initialItemParameters)

        // Initialize render keys (UI-only). Keep them stable across reorders.
        setItemKeys((prev) => {
            if (prev.length === initialArrayItems.length) return prev
            const createKey = () => {
                try {
                    return crypto.randomUUID()
                } catch (e) {
                    return 'key-' + Date.now() + '-' + Math.random()
                }
            }
            // If length changed (e.g., dialog opened with fresh data), rebuild to match.
            return Array.from({ length: initialArrayItems.length }, () => createKey())
        })
    }, [data, inputParam])

    const updateOutputAnchors = (items, type, indexToDelete) => {
        // Skip output anchor updates for DocStore context
        if (isDocStore || !reactFlowInstance) return

        if (!isConditionAgentNode) return

        const updatedOutputs = items.map((_, i) => ({
            id: `${data.id}-output-${i}`,
            label: i,
            name: i,
            description: `Condition ${i}`
        }))

        // always append additional output anchor for ELSE for condition
        if (data.name === 'conditionAgentflow') {
            updatedOutputs.push({
                id: `${data.id}-output-${items.length}`,
                label: items.length,
                name: items.length,
                description: 'Else'
            })
        }
        data.outputAnchors = updatedOutputs

        const nodes = reactFlowInstance.getNodes()

        // Update the current node with new output anchors
        const updatedNodes = nodes.map((node) => {
            if (node.id === data.id) {
                return {
                    ...node,
                    data: {
                        ...node.data,
                        outputAnchors: updatedOutputs
                    }
                }
            }
            return node
        })

        reactFlowInstance.setNodes(updatedNodes)

        // Update edges if an item is deleted
        if (type === 'DELETE') {
            const edges = reactFlowInstance.getEdges()
            const updatedEdges = edges.filter((edge) => {
                if (edge.sourceHandle && edge.sourceHandle.includes(data.id)) {
                    const sourceHandleIndex = edge.sourceHandle.split('-').pop()
                    if (sourceHandleIndex === indexToDelete.toString()) {
                        return false
                    }
                }
                return true
            })
            reactFlowInstance.setEdges(updatedEdges)
        }
    }

    // Handler for adding new array items
    const handleAddItem = () => {
        // Initialize new item with default values
        let newItem = {}

        for (const fieldDef of inputParam.array) {
            newItem[fieldDef.name] = fieldDef.default || ''
        }

        /*if (inputParam.default?.length) {
            newItem = inputParam.default[0]
        }*/

        // Update array items
        const updatedArrayItems = [...arrayItems, newItem]
        setArrayItems(updatedArrayItems)
        data.inputs[inputParam.name] = updatedArrayItems

        // keep render keys aligned (UI-only, do not persist)
        setItemKeys((prev) => {
            const next = [...prev]
            try {
                next.push(crypto.randomUUID())
            } catch (e) {
                next.push('key-' + Date.now() + '-' + Math.random())
            }
            return next
        })

        // Calculate display parameters for all items including new one
        const updatedItemParameters = []
        for (let i = 0; i < updatedArrayItems.length; i += 1) {
            const itemParams = showHideInputs(data, 'inputParams', cloneDeep(inputParam.array), i)
            if (itemParams.length) {
                updatedItemParameters.push(itemParams)
            }
        }
        setItemParameters(updatedItemParameters)

        updateOutputAnchors(updatedArrayItems, 'ADD')
    }

    // Handler for deleting array items
    const handleDeleteItem = (indexToDelete) => {
        const updatedArrayItems = arrayItems.filter((_, i) => i !== indexToDelete)
        setArrayItems(updatedArrayItems)
        data.inputs[inputParam.name] = updatedArrayItems

        // keep render keys aligned (UI-only, do not persist)
        setItemKeys((prev) => prev.filter((_, i) => i !== indexToDelete))

        const updatedItemParameters = itemParameters.filter((_, i) => i !== indexToDelete)
        setItemParameters(updatedItemParameters)

        updateOutputAnchors(updatedArrayItems, 'DELETE', indexToDelete)
    }

    const isDeleteButtonVisible = (data.name !== 'conditionAgentflow' && data.name !== 'conditionAgentAgentflow') || arrayItems.length > 1

    return (
        <>
            {/* Render each array item */}
            {arrayItems.map((itemValues, index) => {
                // Create item data directly from parent data
                const itemData = {
                    ...data,
                    inputs: itemValues,
                    inputParams: itemParameters[index] || []
                }

                return (
                    <Box
                        sx={{
                            p: 2,
                            mt: 2,
                            mb: 1,
                            border: 1,
                            borderColor: theme.palette.grey[900] + 25,
                            borderRadius: 2,
                            position: 'relative'
                        }}
                        key={itemKeys[index] ?? index}
                    >
                        {/* Delete button for array item */}
                        {isDeleteButtonVisible && (
                            <IconButton
                                title='Delete'
                                onClick={() => handleDeleteItem(index)}
                                sx={{
                                    position: 'absolute',
                                    height: '35px',
                                    width: '35px',
                                    right: 10,
                                    top: 10,
                                    color: customization?.isDarkMode ? theme.palette.grey[300] : 'inherit',
                                    '&:hover': { color: 'red' }
                                }}
                            >
                                <IconTrash />
                            </IconButton>
                        )}

                        <Chip
                            label={`${index}`}
                            size='small'
                            sx={{ position: 'absolute', right: isDeleteButtonVisible ? 45 : 10, top: 16 }}
                        />

                        {enableReorder && (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    // Place arrows on the same row, to the left of the index chip
                                    right: isDeleteButtonVisible ? 78 : 43,
                                    top: 14,
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 0.25
                                }}
                            >
                                <IconButton
                                    title='Move up'
                                    size='small'
                                    disabled={disabled || index === 0}
                                    onClick={() => handleMoveUp(index)}
                                    sx={{ height: '22px', width: '22px', p: 0 }}
                                >
                                    <IconArrowUp size={16} />
                                </IconButton>
                                <IconButton
                                    title='Move down'
                                    size='small'
                                    disabled={disabled || index === arrayItems.length - 1}
                                    onClick={() => handleMoveDown(index)}
                                    sx={{ height: '22px', width: '22px', p: 0 }}
                                >
                                    <IconArrowDown size={16} />
                                </IconButton>
                            </Box>
                        )}

                        {/* Render input fields for array item */}
                        {(itemParameters[index] || [])
                            .filter((param) => param.display !== false)
                            .map((param, _index) => {
                                if (isDocStore) {
                                    return (
                                        <DocStoreInputHandler
                                            disabled={disabled}
                                            key={_index}
                                            inputParam={param}
                                            data={itemData}
                                            onNodeDataChange={({ inputParam, newValue }) => {
                                                handleItemInputChange({ inputParam, newValue }, index)
                                            }}
                                        />
                                    )
                                }
                                return (
                                    <NodeInputHandler
                                        disabled={disabled}
                                        key={_index}
                                        inputParam={param}
                                        data={itemData}
                                        isAdditionalParams={true}
                                        parentParamForArray={inputParam}
                                        arrayIndex={index}
                                        onCustomDataChange={({ inputParam, newValue }) => {
                                            handleItemInputChange({ inputParam, newValue }, index)
                                        }}
                                    />
                                )
                            })}
                    </Box>
                )
            })}

            {/* Add new item button */}
            <Button
                fullWidth
                size='small'
                variant='outlined'
                sx={{ borderRadius: '16px', mt: 2 }}
                startIcon={<IconPlus />}
                onClick={handleAddItem}
            >
                Add {inputParam.label}
            </Button>
        </>
    )
}

ArrayRenderer.propTypes = {
    inputParam: PropTypes.object.isRequired,
    data: PropTypes.object.isRequired,
    disabled: PropTypes.bool,
    isDocStore: PropTypes.bool
}
