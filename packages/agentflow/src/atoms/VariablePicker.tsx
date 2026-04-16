import { useMemo } from 'react'

import { Box, Divider, List, ListItem, ListItemAvatar, ListItemButton, ListItemText, Stack, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { IconBinaryTree, IconHistory, IconMessageChatbot, IconPaperclip } from '@tabler/icons-react'

export interface VariableItem {
    label: string
    description?: string
    category?: string
    value: string
    /** Optional per-item icon component (e.g. the upstream node's icon). */
    icon?: React.ElementType
    /** Optional per-item icon color. Falls back to the category color. */
    iconColor?: string
}

export interface VariablePickerProps {
    items: VariableItem[]
    onSelect: (variableString: string) => void
    disabled?: boolean
}

const CATEGORY_STYLE: Record<string, { icon: React.ElementType; color: string }> = {
    'Chat Context': { icon: IconMessageChatbot, color: '#6EC6E6' },
    'Node Outputs': { icon: IconHistory, color: '#64B5F6' },
    'Flow State': { icon: IconBinaryTree, color: '#FFA07A' }
}

const DEFAULT_STYLE = { icon: IconPaperclip, color: '#90A4AE' }

/**
 * Grouped variable picker panel. Shows variables organized by category with
 * section headers and colored icons. Used in popovers (e.g. JSON editor per-key
 * injection, non-TipTap variable selection).
 */
export function VariablePicker({ items, onSelect, disabled = false }: VariablePickerProps) {
    const theme = useTheme()
    const grouped = useMemo(() => {
        const groups: { category: string; items: VariableItem[] }[] = []
        const seen = new Map<string, VariableItem[]>()
        for (const item of items) {
            const cat = item.category ?? 'Other'
            if (!seen.has(cat)) {
                const arr: VariableItem[] = []
                seen.set(cat, arr)
                groups.push({ category: cat, items: arr })
            }
            seen.get(cat)!.push(item)
        }
        return groups
    }, [items])

    if (disabled || items.length === 0) return null

    return (
        <div style={{ flex: 30 }}>
            <Stack flexDirection='row' sx={{ mb: 1, ml: 2, mt: 2 }}>
                <Typography variant='h5'>Select Variable</Typography>
            </Stack>
            <Box sx={{ maxHeight: 'calc(100vh - 220px)', overflowY: 'auto', overflowX: 'hidden', px: 2 }}>
                {grouped.map((group, groupIdx) => {
                    const style = CATEGORY_STYLE[group.category] || DEFAULT_STYLE
                    const Icon = style.icon

                    return (
                        <Box key={group.category}>
                            {groupIdx > 0 && <Divider sx={{ my: 1 }} />}
                            <Typography
                                variant='overline'
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.5,
                                    mt: 1,
                                    mb: 0.5,
                                    color: 'text.secondary'
                                }}
                            >
                                <Icon size={16} color={style.color} />
                                {group.category}
                            </Typography>
                            <List disablePadding>
                                {group.items.map((item, idx) => {
                                    const ItemIcon = item.icon ?? Icon
                                    const itemColor = item.iconColor ?? style.color
                                    return (
                                        <ListItemButton
                                            key={`${item.value}-${idx}`}
                                            sx={{
                                                p: 0,
                                                borderRadius: `${theme.shape.borderRadius}px`,
                                                boxShadow: '0 2px 14px 0 rgb(32 40 45 / 8%)',
                                                mb: 1
                                            }}
                                            onClick={() => onSelect(item.value)}
                                        >
                                            <ListItem alignItems='center'>
                                                <ListItemAvatar>
                                                    <Box
                                                        sx={{
                                                            width: 50,
                                                            height: 50,
                                                            borderRadius: '50%',
                                                            backgroundColor: 'white',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}
                                                    >
                                                        <ItemIcon size={30} stroke={1.5} color={itemColor} />
                                                    </Box>
                                                </ListItemAvatar>
                                                <ListItemText sx={{ ml: 1 }} primary={item.label} secondary={item.description} />
                                            </ListItem>
                                        </ListItemButton>
                                    )
                                })}
                            </List>
                        </Box>
                    )
                })}
            </Box>
        </div>
    )
}
