import { useState } from 'react'

import { Box, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'

import { MetricsDisplay, NodeIcon } from '@/atoms'
import type { ExecutionTreeNode, HumanInputParams, UsedToolRef } from '@/core/types'
import { isAvailableToolArray, isUsedToolArray } from '@/core/utils'
import { useObserveConfig } from '@/infrastructure/store'

import { useHumanInput } from '../hooks/useHumanInput'
import { useNodeData } from '../hooks/useNodeData'

import { ChatMessageBubble } from './ChatMessageBubble'
import { FulfilledConditionsBlock } from './FulfilledConditionsBlock'
import { HitlPanel } from './HitlPanel'
import { NodeContentRenderer } from './NodeContentRenderer'
import { RawJsonPanel } from './RawJsonPanel'
import { ToolAccordionList } from './ToolAccordionList'
import { UsedToolChips } from './UsedToolChips'

type DataView = 'rendered' | 'raw'

interface NodeExecutionDetailProps {
    node: ExecutionTreeNode
    agentflowId: string
    sessionId: string
    onHumanInput?: (agentflowId: string, params: HumanInputParams) => Promise<void>
}

/**
 * Right-panel detail view for a selected node in the execution tree.
 * Shows node metadata, metrics, rendered/raw output, and HITL controls when
 * applicable.
 *
 * HITL controls render only when ALL of:
 *  - `onHumanInput` callback is provided
 *  - the node's `name` is `humanInputAgentflow`
 *  - the node's `status` is `INPROGRESS`
 *
 * The feedback dialog is gated on the `humanInputEnableFeedback` flag inside
 * the node's data payload.
 */
export function NodeExecutionDetail({ node, agentflowId, sessionId, onHumanInput }: NodeExecutionDetailProps) {
    const theme = useTheme()
    const { isDarkMode, apiBaseUrl } = useObserveConfig()
    const [dataView, setDataView] = useState<DataView>('rendered')

    const {
        payload,
        dataOutput,
        inputMessages,
        inputValue,
        outputValue,
        outputConditions,
        errorValue,
        stateValue,
        hasInput,
        hasError,
        hasState,
        isHumanInputNode,
        enableFeedback
    } = useNodeData(node)

    const showHitlControls = !!onHumanInput && isHumanInputNode && node.status === 'INPROGRESS'

    const hitl = useHumanInput({
        agentflowId,
        sessionId,
        nodeId: node.nodeId,
        enableFeedback,
        onHumanInput
    })

    const handleDataViewChange = (_: unknown, next: DataView | null) => {
        // Null-guard: ToggleButtonGroup emits null when the user clicks the
        // active button to deselect. Keep the existing view in that case.
        if (next === null) return
        setDataView(next)
    }

    const sectionBoxSx = {
        mt: 1,
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        py: 1,
        px: 2,
        backgroundColor: 'background.paper'
    } as const

    // Toggle button: subtle border that adapts to mode. Berry's theme remaps
    // grey[900] to a LIGHT color in dark mode; ours keeps it dark in both
    // modes, so use `divider` (auto-mode-aware) for a visible outline.
    // Berry never overrides `theme.shape.borderRadius`, so legacy's
    // `borderRadius: 2` resolves against MUI's default 4 → 8px corners. Our
    // theme sets shape=8, so `borderRadius: 1` (= 1 × 8) reproduces the same
    // 8px corners; `borderRadius: 2` would render as 16px (too pill-like).
    const toggleButtonSx = {
        borderColor: theme.palette.divider,
        borderRadius: 1,
        textTransform: 'none' as const,
        color: isDarkMode ? 'common.white' : 'inherit'
    }

    return (
        <Box sx={{ height: '100%', overflow: 'auto', p: 2 }}>
            <Stack direction='row' spacing={1.5} alignItems='center' sx={{ mb: 1.5 }}>
                {/* Virtual iteration container nodes have a synthesized
                    nodeId like `${parent}-iteration-${idx}` and no resolvable
                    type name — skip the icon to avoid a 404 on the fallback
                    `<img src=…/api/v1/node-icon/${name}>` request. */}
                {!node.isVirtualNode && <NodeIcon name={node.name} size={36} apiBaseUrl={apiBaseUrl} />}
                <Typography variant='h5' sx={{ flex: 1 }}>
                    {node.nodeLabel}
                </Typography>
                <MetricsDisplay output={dataOutput} />
            </Stack>

            <Stack direction='row' justifyContent='flex-start' alignItems='center' sx={{ mt: 2, mb: 1 }}>
                <ToggleButtonGroup
                    size='small'
                    value={dataView}
                    color='primary'
                    exclusive
                    onChange={handleDataViewChange}
                    aria-label='Data view'
                    sx={{ borderRadius: 1, maxHeight: 40 }}
                >
                    <ToggleButton sx={toggleButtonSx} value='rendered' title='Rendered'>
                        Rendered
                    </ToggleButton>
                    <ToggleButton sx={toggleButtonSx} value='raw' title='Raw'>
                        Raw
                    </ToggleButton>
                </ToggleButtonGroup>
            </Stack>

            {dataView === 'raw' ? (
                <RawJsonPanel src={payload} isDarkMode={isDarkMode} />
            ) : (
                <Box>
                    {isAvailableToolArray(dataOutput?.availableTools) && (
                        <Box sx={{ mb: 2 }}>
                            <ToolAccordionList
                                variant='available'
                                tools={dataOutput.availableTools}
                                usedTools={dataOutput.usedTools as UsedToolRef[] | undefined}
                                isDarkMode={isDarkMode}
                                apiBaseUrl={apiBaseUrl}
                            />
                        </Box>
                    )}
                    <Box sx={{ mb: 2 }}>
                        <Typography sx={{ mt: 2 }} variant='h5' gutterBottom>
                            Input
                        </Typography>
                        {inputMessages ? (
                            <Stack spacing={1}>
                                {inputMessages.map((message, idx) => (
                                    <ChatMessageBubble
                                        key={idx}
                                        message={message}
                                        isDarkMode={isDarkMode}
                                        sx={sectionBoxSx}
                                        availableTools={
                                            isAvailableToolArray(dataOutput?.availableTools) ? dataOutput.availableTools : undefined
                                        }
                                        apiBaseUrl={apiBaseUrl}
                                    />
                                ))}
                            </Stack>
                        ) : (
                            <Box sx={sectionBoxSx}>
                                {hasInput ? (
                                    <NodeContentRenderer value={inputValue} isDarkMode={isDarkMode} parsePrimitiveAsJson={false} />
                                ) : (
                                    <NodeContentRenderer value={null} isDarkMode={isDarkMode} />
                                )}
                            </Box>
                        )}
                    </Box>

                    <Box sx={{ mb: 2 }}>
                        <Typography sx={{ mt: 2 }} variant='h5' gutterBottom>
                            Output
                        </Typography>
                        {outputConditions ? (
                            <FulfilledConditionsBlock conditions={outputConditions} isDarkMode={isDarkMode} />
                        ) : (
                            <Box sx={sectionBoxSx}>
                                {isUsedToolArray(dataOutput?.usedTools) && <UsedToolChips tools={dataOutput.usedTools} sx={{ mb: 1 }} />}
                                <NodeContentRenderer value={outputValue} isDarkMode={isDarkMode} />
                            </Box>
                        )}
                    </Box>

                    {hasError && (
                        <Box sx={{ mb: 2 }}>
                            <Typography sx={{ mt: 2 }} variant='h5' gutterBottom color='error'>
                                Error
                            </Typography>
                            <Box sx={{ ...sectionBoxSx, borderColor: 'error.main' }}>
                                <NodeContentRenderer value={errorValue} isDarkMode={isDarkMode} />
                            </Box>
                        </Box>
                    )}

                    {hasState && (
                        <Box sx={{ mb: 2 }}>
                            <Typography sx={{ mt: 2 }} variant='h5' gutterBottom>
                                State
                            </Typography>
                            <NodeContentRenderer value={stateValue} isDarkMode={isDarkMode} />
                        </Box>
                    )}
                </Box>
            )}

            <HitlPanel show={showHitlControls} state={hitl} />
        </Box>
    )
}
