import { useSelector } from 'react-redux'
import PropTypes from 'prop-types'
import { Box, List, ListItemButton, ListItem, ListItemAvatar, ListItemText, Typography, Stack } from '@mui/material'
import PerfectScrollbar from 'react-perfect-scrollbar'

import { baseURL } from 'store/constant'

const SelectVariable = ({ availableNodesForVariable, disabled = false, onSelectAndReturnVal }) => {
    const customization = useSelector((state) => state.customization)

    const onSelectOutputResponseClick = (node, isUserQuestion = false) => {
        let variablePath = isUserQuestion ? `question` : `${node.id}.data.instance`
        const newInput = `{{${variablePath}}}`
        onSelectAndReturnVal(newInput)
    }

    return (
        <>
            {!disabled && (
                <div style={{ flex: 30 }}>
                    <Stack flexDirection='row' sx={{ mb: 1, ml: 2, mt: 2 }}>
                        <Typography variant='h5'>Select Variable</Typography>
                    </Stack>
                    <PerfectScrollbar style={{ height: '100%', maxHeight: 'calc(100vh - 220px)', overflowX: 'hidden' }}>
                        <Box sx={{ pl: 2, pr: 2 }}>
                            <List>
                                <ListItemButton
                                    sx={{
                                        p: 0,
                                        borderRadius: `${customization.borderRadius}px`,
                                        boxShadow: '0 2px 14px 0 rgb(32 40 45 / 8%)',
                                        mb: 1
                                    }}
                                    disabled={disabled}
                                    onClick={() => onSelectOutputResponseClick(null, true)}
                                >
                                    <ListItem alignItems='center'>
                                        <ListItemAvatar>
                                            <div
                                                style={{
                                                    width: 50,
                                                    height: 50,
                                                    borderRadius: '50%',
                                                    backgroundColor: 'white'
                                                }}
                                            >
                                                <img
                                                    style={{
                                                        width: '100%',
                                                        height: '100%',
                                                        padding: 10,
                                                        objectFit: 'contain'
                                                    }}
                                                    alt='AI'
                                                    src='https://raw.githubusercontent.com/zahidkhawaja/langchain-chat-nextjs/main/public/parroticon.png'
                                                />
                                            </div>
                                        </ListItemAvatar>
                                        <ListItemText sx={{ ml: 1 }} primary='question' secondary={`User's question from chatbox`} />
                                    </ListItem>
                                </ListItemButton>
                                {availableNodesForVariable &&
                                    availableNodesForVariable.length > 0 &&
                                    availableNodesForVariable.map((node, index) => {
                                        const selectedOutputAnchor = node.data.outputAnchors[0].options.find(
                                            (ancr) => ancr.name === node.data.outputs['output']
                                        )
                                        return (
                                            <ListItemButton
                                                key={index}
                                                sx={{
                                                    p: 0,
                                                    borderRadius: `${customization.borderRadius}px`,
                                                    boxShadow: '0 2px 14px 0 rgb(32 40 45 / 8%)',
                                                    mb: 1
                                                }}
                                                disabled={disabled}
                                                onClick={() => onSelectOutputResponseClick(node)}
                                            >
                                                <ListItem alignItems='center'>
                                                    <ListItemAvatar>
                                                        <div
                                                            style={{
                                                                width: 50,
                                                                height: 50,
                                                                borderRadius: '50%',
                                                                backgroundColor: 'white'
                                                            }}
                                                        >
                                                            <img
                                                                style={{
                                                                    width: '100%',
                                                                    height: '100%',
                                                                    padding: 10,
                                                                    objectFit: 'contain'
                                                                }}
                                                                alt={node.data.name}
                                                                src={`${baseURL}/api/v1/node-icon/${node.data.name}`}
                                                            />
                                                        </div>
                                                    </ListItemAvatar>
                                                    <ListItemText
                                                        sx={{ ml: 1 }}
                                                        primary={node.data.inputs.chainName ? node.data.inputs.chainName : node.data.id}
                                                        secondary={`${selectedOutputAnchor?.label ?? 'output'} from ${node.data.label}`}
                                                    />
                                                </ListItem>
                                            </ListItemButton>
                                        )
                                    })}
                            </List>
                        </Box>
                    </PerfectScrollbar>
                </div>
            )}
        </>
    )
}

SelectVariable.propTypes = {
    availableNodesForVariable: PropTypes.array,
    disabled: PropTypes.bool,
    onSelectAndReturnVal: PropTypes.func
}

export default SelectVariable
