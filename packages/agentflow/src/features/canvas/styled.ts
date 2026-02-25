import type { ComponentType } from 'react'
import { NodeToolbar, type NodeToolbarProps } from 'reactflow'

import { styled } from '@mui/material/styles'

import { MainCard, type MainCardProps } from '@/atoms'
import { tokens } from '@/core/theme/tokens'

export const CardWrapper: ComponentType<MainCardProps> = styled(MainCard)(({ theme }) => ({
    background: theme.palette.card.main,
    color: theme.palette.text.primary,
    overflow: 'visible',
    border: `solid 1px ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    width: 'max-content',
    height: 'auto',
    padding: tokens.spacing.md,
    boxShadow: 'none'
}))

export const StyledNodeToolbar: ComponentType<NodeToolbarProps> = styled(NodeToolbar)(({ theme }) => ({
    backgroundColor: theme.palette.card.main,
    color: theme.palette.text.primary,
    padding: tokens.spacing.xs,
    borderRadius: tokens.spacing.md,
    boxShadow: tokens.shadows.toolbar[theme.palette.mode === 'dark' ? 'dark' : 'light'],
    border: `1px solid ${theme.palette.divider}`
}))
