import { Box, Card, CardContent, Chip, Stack } from '@mui/material'
import { IconTool, IconDeviceSdCard } from '@tabler/icons-react'
import { MemoizedReactMarkdown } from '@/ui-component/markdown/MemoizedReactMarkdown'
import nextAgentGIF from '@/assets/images/next-agent.gif'
import PropTypes from 'prop-types'

const AgentReasoningCard = ({
    agent,
    index,
    customization,
    chatflowid,
    isDialog,
    onSourceDialogClick,
    renderArtifacts,
    agentReasoningArtifacts,
    getAgentIcon,
    removeDuplicateURL,
    isValidURL,
    onURLClick,
    getLabel
}) => {
    if (agent.nextAgent) {
        return (
            <Card
                key={index}
                sx={{
                    border: customization.isDarkMode ? 'none' : '1px solid #e0e0e0',
                    borderRadius: `${customization.borderRadius}px`,
                    background: customization.isDarkMode
                        ? `linear-gradient(to top, #303030, #212121)`
                        : `linear-gradient(to top, #f6f3fb, #f2f8fc)`,
                    mb: 1
                }}
            >
                <CardContent>
                    <Stack
                        sx={{
                            alignItems: 'center',
                            justifyContent: 'flex-start',
                            width: '100%'
                        }}
                        flexDirection='row'
                    >
                        <Box sx={{ height: 'auto', pr: 1 }}>
                            <img
                                style={{
                                    objectFit: 'cover',
                                    height: '35px',
                                    width: 'auto'
                                }}
                                src={nextAgentGIF}
                                alt='agentPNG'
                            />
                        </Box>
                        <div>{agent.nextAgent}</div>
                    </Stack>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card key={index} sx={{ mb: 1 }}>
            <CardContent>
                <Stack
                    sx={{
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        width: '100%'
                    }}
                    flexDirection='row'
                >
                    <Box sx={{ height: 'auto', pr: 1 }}>
                        <img
                            style={{
                                objectFit: 'cover',
                                height: '25px',
                                width: 'auto'
                            }}
                            src={getAgentIcon(agent.nodeName, agent.instructions)}
                            alt='agentPNG'
                        />
                    </Box>
                    <div>{agent.agentName}</div>
                </Stack>
                {agent.usedTools && agent.usedTools.length > 0 && (
                    <div style={{ display: 'block', flexDirection: 'row', width: '100%' }}>
                        {agent.usedTools.map((tool, index) => {
                            return tool !== null ? (
                                <Chip
                                    size='small'
                                    key={index}
                                    label={tool.tool}
                                    component='a'
                                    sx={{ mr: 1, mt: 1 }}
                                    variant='outlined'
                                    clickable
                                    icon={<IconTool size={15} />}
                                    onClick={() => onSourceDialogClick(tool, 'Used Tools')}
                                />
                            ) : null
                        })}
                    </div>
                )}
                {agent.state && Object.keys(agent.state).length > 0 && (
                    <div style={{ display: 'block', flexDirection: 'row', width: '100%' }}>
                        <Chip
                            size='small'
                            label={'State'}
                            component='a'
                            sx={{ mr: 1, mt: 1 }}
                            variant='outlined'
                            clickable
                            icon={<IconDeviceSdCard size={15} />}
                            onClick={() => onSourceDialogClick(agent.state, 'State')}
                        />
                    </div>
                )}
                {agent.artifacts && (
                    <div
                        style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            flexDirection: 'row',
                            width: '100%',
                            gap: '8px'
                        }}
                    >
                        {agentReasoningArtifacts(agent.artifacts).map((item, index) => {
                            return item !== null ? <>{renderArtifacts(item, index, true)}</> : null
                        })}
                    </div>
                )}
                {agent.messages.length > 0 && (
                    <MemoizedReactMarkdown chatflowid={chatflowid} isFullWidth={isDialog}>
                        {agent.messages.length > 1 ? agent.messages.join('\\n') : agent.messages[0]}
                    </MemoizedReactMarkdown>
                )}
                {agent.instructions && <p>{agent.instructions}</p>}
                {agent.messages.length === 0 && !agent.instructions && <p>Finished</p>}
                {agent.sourceDocuments && agent.sourceDocuments.length > 0 && (
                    <div style={{ display: 'block', flexDirection: 'row', width: '100%' }}>
                        {removeDuplicateURL(agent).map((source, index) => {
                            const URL = source && source.metadata && source.metadata.source ? isValidURL(source.metadata.source) : undefined
                            return (
                                <Chip
                                    size='small'
                                    key={index}
                                    label={getLabel(URL, source) || ''}
                                    component='a'
                                    sx={{ mr: 1, mb: 1 }}
                                    variant='outlined'
                                    clickable
                                    onClick={() => (URL ? onURLClick(source.metadata.source) : onSourceDialogClick(source))}
                                />
                            )
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

AgentReasoningCard.propTypes = {
    agent: PropTypes.object.isRequired,
    index: PropTypes.number.isRequired,
    customization: PropTypes.object.isRequired,
    chatflowid: PropTypes.string,
    isDialog: PropTypes.bool,
    onSourceDialogClick: PropTypes.func.isRequired,
    renderArtifacts: PropTypes.func.isRequired,
    agentReasoningArtifacts: PropTypes.func.isRequired,
    getAgentIcon: PropTypes.func.isRequired,
    removeDuplicateURL: PropTypes.func.isRequired,
    isValidURL: PropTypes.func.isRequired,
    onURLClick: PropTypes.func.isRequired,
    getLabel: PropTypes.func.isRequired
}

AgentReasoningCard.displayName = 'AgentReasoningCard'

export default AgentReasoningCard
