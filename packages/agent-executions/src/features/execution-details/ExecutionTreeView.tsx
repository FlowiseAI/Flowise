import { forwardRef } from 'react'
import { RichTreeView } from '@mui/x-tree-view/RichTreeView'
import { Typography, Box } from '@mui/material'
import { styled, alpha } from '@mui/material/styles'
import { useTreeItem2 } from '@mui/x-tree-view/useTreeItem2'
import {
    TreeItem2Content,
    TreeItem2IconContainer,
    TreeItem2GroupTransition,
    TreeItem2Label,
    TreeItem2Root,
    TreeItem2Checkbox
} from '@mui/x-tree-view/TreeItem2'
import { TreeItem2Icon } from '@mui/x-tree-view/TreeItem2Icon'
import { TreeItem2Provider } from '@mui/x-tree-view/TreeItem2Provider'
import { TreeItem2DragAndDropOverlay } from '@mui/x-tree-view/TreeItem2DragAndDropOverlay'
import { IconRelationOneToManyFilled } from '@tabler/icons-react'
import { useTheme } from '@mui/material/styles'
import { AGENTFLOW_ICONS } from '../../constants'
import { getIconFromStatus, getIconColor } from '../../atoms/StatusIcon'
import type { ExecutionTreeItem, ExecutionState } from '../../types'

const StyledTreeItemRoot = styled(TreeItem2Root)(({ theme }) => ({
    color: theme.palette.grey[400]
}))

const CustomTreeItemContent = styled(TreeItem2Content)(({ theme }) => ({
    flexDirection: 'row-reverse',
    borderRadius: theme.spacing(0.7),
    marginBottom: theme.spacing(0.5),
    marginTop: theme.spacing(0.5),
    padding: theme.spacing(0.5),
    paddingRight: theme.spacing(1),
    fontWeight: 500,
    [`&.Mui-expanded `]: {
        '&:not(.Mui-focused, .Mui-selected, .Mui-selected.Mui-focused) .labelIcon': {
            color: theme.palette.primary.dark,
            ...theme.applyStyles('light', {
                color: theme.palette.primary.main
            })
        },
        '&::before': {
            content: '""',
            display: 'block',
            position: 'absolute',
            left: '16px',
            top: '44px',
            height: 'calc(100% - 48px)',
            width: '1.5px',
            backgroundColor: theme.palette.grey[700],
            ...theme.applyStyles('light', {
                backgroundColor: theme.palette.grey[300]
            })
        }
    },
    '&:hover': {
        backgroundColor: alpha(theme.palette.primary.main, 0.1),
        color: 'white',
        ...theme.applyStyles('light', {
            color: theme.palette.primary.main
        })
    },
    [`&.Mui-focused, &.Mui-selected, &.Mui-selected.Mui-focused`]: {
        backgroundColor: theme.palette.primary.dark,
        color: theme.palette.primary.contrastText,
        ...theme.applyStyles('light', {
            backgroundColor: theme.palette.primary.main
        })
    }
}))

const StyledTreeItemLabelText = styled(Typography)(({ theme }) => ({
    color: theme.palette.text.primary
}))

interface CustomLabelProps {
    icon?: React.ComponentType<Record<string, unknown>> | null
    itemStatus?: string
    children: React.ReactNode
    name?: string
    expandable?: boolean
    [key: string]: unknown
}

function CustomLabel({ icon: Icon, itemStatus, children, name, ...other }: CustomLabelProps) {
    const isIterationNode = name === 'iterationAgentflow'

    return (
        <TreeItem2Label {...other} sx={{ display: 'flex', alignItems: 'center' }}>
            {(() => {
                if (isIterationNode) {
                    return (
                        <Box sx={{ mr: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <IconRelationOneToManyFilled size={20} color={'#9C89B8'} />
                        </Box>
                    )
                }

                const foundIcon = AGENTFLOW_ICONS.find((icon) => icon.name === name)
                if (foundIcon) {
                    return (
                        <Box sx={{ mr: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <foundIcon.icon size={20} color={foundIcon.color} />
                        </Box>
                    )
                }
                return null
            })()}

            <StyledTreeItemLabelText sx={{ flex: 1 }}>{children}</StyledTreeItemLabelText>

            {Icon && (
                <Box
                    component={Icon as React.ElementType}
                    className='labelIcon'
                    color={getIconColor(itemStatus as ExecutionState)}
                    sx={{ ml: 1, fontSize: '1.2rem' }}
                />
            )}
        </TreeItem2Label>
    )
}

const isExpandable = (reactChildren: React.ReactNode): boolean => {
    if (Array.isArray(reactChildren)) {
        return reactChildren.length > 0 && reactChildren.some(isExpandable)
    }
    return Boolean(reactChildren)
}

interface CustomTreeItemProps {
    id?: string
    itemId: string
    label?: string
    disabled?: boolean
    children?: React.ReactNode
    [key: string]: unknown
}

const CustomTreeItem = forwardRef(function CustomTreeItem(props: CustomTreeItemProps, ref: React.Ref<HTMLLIElement>) {
    const { id, itemId, label, disabled, children, ...other } = props
    const theme = useTheme()

    const {
        getRootProps,
        getContentProps,
        getIconContainerProps,
        getCheckboxProps,
        getLabelProps,
        getGroupTransitionProps,
        getDragAndDropOverlayProps,
        status,
        publicAPI
    } = useTreeItem2({ id, itemId, children, label, disabled, rootRef: ref })

    const item = publicAPI.getItem(itemId)
    const expandable = isExpandable(children)
    let icon = null
    if (item.status) {
        icon = getIconFromStatus(item.status as ExecutionState, theme)
    }

    return (
        <TreeItem2Provider itemId={itemId}>
            <StyledTreeItemRoot {...getRootProps(other)}>
                <CustomTreeItemContent {...getContentProps()}>
                    <TreeItem2IconContainer {...getIconContainerProps()}>
                        <TreeItem2Icon status={status} />
                    </TreeItem2IconContainer>
                    <TreeItem2Checkbox {...getCheckboxProps()} />
                    <CustomLabel
                        {...getLabelProps({
                            icon,
                            itemStatus: item.status,
                            expandable: expandable && status.expanded,
                            name: item.name || item.id?.split('_')[0]
                        })}
                    />
                    <TreeItem2DragAndDropOverlay {...getDragAndDropOverlayProps()} />
                </CustomTreeItemContent>
                {children && (
                    <TreeItem2GroupTransition
                        {...getGroupTransitionProps()}
                        style={{
                            borderLeft: `${status.selected ? '3px solid' : '1px dashed'} ${(() => {
                                const nodeName = item.name || item.id?.split('_')[0]
                                const foundIcon = AGENTFLOW_ICONS.find((icon) => icon.name === nodeName)
                                return foundIcon ? foundIcon.color : theme.palette.primary.main
                            })()}`,
                            marginLeft: '13px',
                            paddingLeft: '8px'
                        }}
                    />
                )}
            </StyledTreeItemRoot>
        </TreeItem2Provider>
    )
})

interface ExecutionTreeViewProps {
    items: ExecutionTreeItem[]
    expandedItems: string[]
    selectedItems: string[]
    onExpandedItemsChange: (event: React.SyntheticEvent, itemIds: string[]) => void
    onSelectedItemsChange: (event: React.SyntheticEvent, itemId: string) => void
}

export const ExecutionTreeView = ({
    items,
    expandedItems,
    selectedItems,
    onExpandedItemsChange,
    onSelectedItemsChange
}: ExecutionTreeViewProps) => {
    return (
        <RichTreeView
            expandedItems={expandedItems}
            onExpandedItemsChange={onExpandedItemsChange}
            selectedItems={selectedItems as unknown as string}
            onSelectedItemsChange={onSelectedItemsChange as unknown as (event: React.SyntheticEvent, itemIds: string | null) => void}
            items={items}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            slots={{ item: CustomTreeItem as any }}
        />
    )
}
