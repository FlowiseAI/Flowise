import type { ComponentType } from 'react'
import { NodeToolbar, type NodeToolbarProps } from 'reactflow'

import { styled } from '@mui/material/styles'

import { MainCard, type MainCardProps } from '../../atoms'

export const CardWrapper: ComponentType<MainCardProps> = styled(MainCard)(({ theme }) => ({
    background: (theme.palette as unknown as { card?: { main?: string } }).card?.main || theme.palette.background.paper,
    color: theme.palette.text.primary,
    border: 'solid 1px',
    borderRadius: '8px',
    width: 'max-content',
    height: 'auto',
    padding: '10px',
    boxShadow: 'none'
}))

export const StyledNodeToolbar: ComponentType<NodeToolbarProps> = styled(NodeToolbar)(({ theme }) => ({
    backgroundColor: (theme.palette as unknown as { card?: { main?: string } }).card?.main || theme.palette.background.paper,
    color: theme.palette.text.primary,
    padding: '5px',
    borderRadius: '10px',
    boxShadow: '0 2px 14px 0 rgb(32 40 45 / 8%)'
}))
