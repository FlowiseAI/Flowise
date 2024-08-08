import * as React from 'react'
import clsx from 'clsx'

import TreeView from '@mui/lab/TreeView'
import TreeItem, { TreeItemProps, useTreeItem, TreeItemContentProps } from '@mui/lab/TreeItem'

import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'

import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'

import { buildTree } from './buildTree'
import { Document } from 'types'

interface TreeNode {
    id: string
    path: string
    children?: readonly TreeNode[]
}

const CustomContent = React.forwardRef(function CustomContent(props: TreeItemContentProps, ref) {
    const {
        classes,
        className,
        label,
        nodeId,
        icon: iconProp,
        expansionIcon,
        displayIcon,
        children
        // handleAdd
    } = props

    const { disabled, expanded, selected, focused, handleExpansion, handleSelection, preventSelection } = useTreeItem(nodeId)

    const icon = iconProp || expansionIcon || displayIcon

    const handleMouseDown = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        preventSelection(event)
    }

    const handleExpansionClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        handleExpansion(event)
    }

    const handleSelectionClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        handleSelection(event)
    }

    return (
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions
        <div
            className={clsx(className, classes.root, {
                [classes.expanded]: expanded,
                [classes.selected]: selected,
                [classes.focused]: focused,
                [classes.disabled]: disabled
            })}
            onMouseDown={handleMouseDown}
            ref={ref as React.Ref<HTMLDivElement>}
        >
            {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions */}
            <div onClick={handleExpansionClick} className={classes.iconContainer}>
                {icon}
            </div>
            <Typography onClick={handleSelectionClick} component='div' className={classes.label}>
                {label}
            </Typography>
            <Button variant='text'>Add page</Button>
        </div>
    )
})

function CustomTreeItem(props: TreeItemProps) {
    return <TreeItem ContentComponent={CustomContent} {...props} />
}

export default function DocumentTree({ documents }: { documents: Document[] }) {
    const tree = React.useMemo(() => {
        const newTree = buildTree(documents)
        // console.log(newTree);
        return newTree
    }, [documents])

    function RichObjectTreeView() {
        const renderTree = (nodes: TreeNode) => (
            <CustomTreeItem key={nodes.id} nodeId={nodes.id} label={nodes.path}>
                {Array.isArray(nodes.children) ? nodes.children.map((node) => renderTree(node)) : null}
            </CustomTreeItem>
        )

        return (
            <TreeView
                aria-label='rich object'
                defaultCollapseIcon={<ExpandMoreIcon />}
                defaultExpanded={['root']}
                defaultExpandIcon={<ChevronRightIcon />}
                sx={{ height: 500, flexGrow: 1, maxWidth: 640, overflowY: 'auto' }}
            >
                {renderTree(tree)}
            </TreeView>
        )
    }

    return <RichObjectTreeView />
}
