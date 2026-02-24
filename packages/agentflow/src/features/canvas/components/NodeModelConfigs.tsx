import { memo } from 'react'

import { Box, Typography } from '@mui/material'

import { useApiContext, useConfigContext } from '@/infrastructure/store'

interface ModelConfig {
    model?: string
    config?: { modelName?: string; model?: string }
}

export interface NodeModelConfigsProps {
    inputs?: Record<string, unknown>
}

/**
 * Displays model configuration badges on a node
 */
function NodeModelConfigsComponent({ inputs }: NodeModelConfigsProps) {
    const { apiBaseUrl } = useApiContext()
    const { isDarkMode } = useConfigContext()

    if (!inputs) return null

    const modelConfigs: ModelConfig[] = [
        { model: inputs.llmModel as string, config: inputs.llmModelConfig as ModelConfig['config'] },
        { model: inputs.agentModel as string, config: inputs.agentModelConfig as ModelConfig['config'] },
        { model: inputs.conditionAgentModel as string, config: inputs.conditionAgentModelConfig as ModelConfig['config'] }
    ]

    const validConfigs = modelConfigs.filter((item) => item.model && item.config)

    if (validConfigs.length === 0) return null

    return (
        <>
            {validConfigs.map((item, index) => (
                <Box key={`model-${index}`} sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    <Box
                        sx={{
                            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.9)',
                            borderRadius: '16px',
                            width: 'max-content',
                            height: 24,
                            pl: 1,
                            pr: 1,
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center'
                        }}
                    >
                        <img
                            style={{ width: 20, height: 20, objectFit: 'contain' }}
                            src={`${apiBaseUrl}/api/v1/node-icon/${item.model}`}
                            alt={item.model as string}
                        />
                        <Typography sx={{ fontSize: '0.7rem', ml: 0.5 }}>{item.config?.modelName || item.config?.model}</Typography>
                    </Box>
                </Box>
            ))}
        </>
    )
}

export const NodeModelConfigs = memo(NodeModelConfigsComponent)
