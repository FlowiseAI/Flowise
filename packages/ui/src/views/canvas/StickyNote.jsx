import PropTypes from 'prop-types'
import { memo, useContext } from 'react'

// material-ui
import { useTheme } from '@mui/material/styles'

// project imports
import NodeCardWrapper from '@/ui-component/cards/NodeCardWrapper'
import { Box, Button, ButtonGroup, Stack } from '@mui/material'
import { IconCopy, IconTrash } from '@tabler/icons-react'
import { Input } from '@/ui-component/input/Input'

// const
import { flowContext } from '@/store/context/ReactFlowContext'

const StickyNote = ({ data }) => {
    const theme = useTheme()
    const { deleteNode, duplicateNode } = useContext(flowContext)
    const [inputParam] = data.inputParams

    return (
        <Stack
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: 0.5,
                '& > .node-actions': {
                    visibility: 'hidden',
                    pointerEvents: 'none'
                },
                '&:hover > .node-actions': {
                    visibility: 'visible',
                    pointerEvents: 'auto'
                }
            }}
        >
            <ButtonGroup
                className='node-actions'
                sx={{
                    background: theme.palette.card.main,
                    borderRadius: '8px',
                    height: '26px',
                    '& > button': {
                        border: 'none',
                        borderColor: 'transparent',
                        color: theme?.customization?.isDarkMode ? theme.colors?.paper : 'inherit',
                        minWidth: '28px !important',
                        width: '24px',
                        height: '24px',
                        padding: '0.45rem',
                        '&:hover': {
                            border: 'none',
                            borderRightColor: '#454c59 !important'
                        }
                    }
                }}
                variant='outlined'
            >
                <Button
                    title='Duplicate'
                    onClick={() => {
                        duplicateNode(data.id)
                    }}
                    sx={{
                        '&:hover': { color: theme?.palette.primary.main }
                    }}
                >
                    <IconCopy />
                </Button>
                <Button
                    title='Delete'
                    onClick={() => {
                        deleteNode(data.id)
                    }}
                    sx={{
                        '&:hover': { color: 'red' }
                    }}
                >
                    <IconTrash />
                </Button>
            </ButtonGroup>
            <NodeCardWrapper
                content={false}
                sx={{
                    padding: 0,
                    borderColor: data.selected ? theme.palette.primary.main : theme.palette.text.secondary,
                    backgroundColor: data.selected ? '#FFDC00' : '#FFE770'
                }}
                border={false}
            >
                <Box>
                    <Input
                        key={data.id}
                        inputParam={inputParam}
                        onChange={(newValue) => (data.inputs[inputParam.name] = newValue)}
                        value={data.inputs[inputParam.name] ?? inputParam.default ?? ''}
                        nodes={inputParam?.acceptVariable && reactFlowInstance ? reactFlowInstance.getNodes() : []}
                        edges={inputParam?.acceptVariable && reactFlowInstance ? reactFlowInstance.getEdges() : []}
                        nodeId={data.id}
                    />
                </Box>
            </NodeCardWrapper>
        </Stack>
    )
}

StickyNote.propTypes = {
    data: PropTypes.object
}

export default memo(StickyNote)
