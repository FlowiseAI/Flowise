import { useMemo } from 'react'

import { Box, List, ListItem, ListItemAvatar, ListItemButton, ListItemText, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import {
    IconBinaryTree,
    IconForms,
    IconHistory,
    IconMessage,
    IconPaperclip,
    IconRepeat,
    IconRouter,
    IconVariable
} from '@tabler/icons-react'

export interface VariableItem {
    label: string
    description?: string
    category?: string
    value: string
}

export interface SelectVariableProps {
    items: VariableItem[]
    disabled?: boolean
    onSelect: (variableString: string) => void
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
    'Chat Context': IconMessage,
    'Flow Variables': IconRouter,
    'Flow State': IconBinaryTree,
    'Node Outputs': IconHistory,
    'Custom Variables': IconVariable,
    'Form Inputs': IconForms,
    Iteration: IconRepeat
}

const DEFAULT_ICON = IconPaperclip

/**
 * Presentational variable picker atom.
 *
 * Renders a scrollable, categorised list of variables. Clicking an item
 * calls `onSelect` with the pre-formatted variable string (e.g. `"{{question}}"`).
 * All data is passed via props — no context or API access.
 */
export function SelectVariable({ items, disabled = false, onSelect }: SelectVariableProps) {
    const theme = useTheme()

    const grouped = useMemo(() => {
        const map = new Map<string, VariableItem[]>()
        for (const item of items) {
            const cat = item.category ?? 'Other'
            const list = map.get(cat)
            if (list) {
                list.push(item)
            } else {
                map.set(cat, [item])
            }
        }
        return map
    }, [items])

    if (disabled || items.length === 0) return null

    return (
        <Box sx={{ width: '100%' }}>
            <Typography variant='h5' sx={{ mb: 1, ml: 2, mt: 2 }}>
                Select Variable
            </Typography>
            <Box sx={{ maxHeight: 'calc(100vh - 220px)', overflowY: 'auto', px: 2 }}>
                <List disablePadding>
                    {Array.from(grouped.entries()).map(([category, categoryItems]) => {
                        const CategoryIcon = CATEGORY_ICONS[category] || DEFAULT_ICON

                        return (
                            <Box key={category} sx={{ mb: 1 }}>
                                <Typography
                                    variant='overline'
                                    sx={{ color: theme.palette.text.secondary, ml: 1, display: 'block', mb: 0.5 }}
                                >
                                    {category}
                                </Typography>
                                {categoryItems.map((item, idx) => (
                                    <ListItemButton
                                        key={`${item.value}-${idx}`}
                                        sx={{
                                            p: 0,
                                            borderRadius: '8px',
                                            boxShadow: '0 2px 14px 0 rgb(32 40 45 / 8%)',
                                            mb: 0.5
                                        }}
                                        onClick={() => onSelect(item.value)}
                                    >
                                        <ListItem alignItems='center'>
                                            <ListItemAvatar>
                                                <Box
                                                    sx={{
                                                        width: 36,
                                                        height: 36,
                                                        borderRadius: '50%',
                                                        backgroundColor: theme.palette.background.paper,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        border: `1px solid ${theme.palette.divider}`
                                                    }}
                                                >
                                                    <CategoryIcon size={18} stroke={1.5} />
                                                </Box>
                                            </ListItemAvatar>
                                            <ListItemText
                                                sx={{ ml: 1 }}
                                                primary={item.label}
                                                secondary={item.description}
                                                primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                                                secondaryTypographyProps={{ variant: 'caption' }}
                                            />
                                        </ListItem>
                                    </ListItemButton>
                                ))}
                            </Box>
                        )
                    })}
                </List>
            </Box>
        </Box>
    )
}
