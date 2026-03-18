import { Box, List, ListItem, ListItemAvatar, ListItemButton, ListItemText, Stack, Typography } from '@mui/material'
import { IconBinaryTree, IconHistory, IconMessageChatbot, IconPaperclip } from '@tabler/icons-react'

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

/** Maps each category to an icon and color matching the original Flowise SelectVariable. */
const CATEGORY_STYLE: Record<string, { icon: React.ElementType; color: string }> = {
    'Chat Context': { icon: IconMessageChatbot, color: '#6EC6E6' },
    'Node Outputs': { icon: IconHistory, color: '#64B5F6' },
    'Flow State': { icon: IconBinaryTree, color: '#FFA07A' }
}

const DEFAULT_STYLE = { icon: IconPaperclip, color: '#90A4AE' }

/**
 * Presentational variable picker atom.
 *
 * Renders a flat, scrollable list of variables matching the original Flowise
 * SelectVariable styling — 50x50 white circle avatars with colored icons,
 * no category headers, consistent card-like item spacing.
 */
export function SelectVariable({ items, disabled = false, onSelect }: SelectVariableProps) {
    if (disabled || items.length === 0) return null

    return (
        <div style={{ flex: 30 }}>
            <Stack flexDirection='row' sx={{ mb: 1, ml: 2, mt: 2 }}>
                <Typography variant='h5'>Select Variable</Typography>
            </Stack>
            <Box sx={{ maxHeight: 'calc(100vh - 220px)', overflowY: 'auto', overflowX: 'hidden', px: 2 }}>
                <List>
                    {items.map((item, idx) => {
                        const style = CATEGORY_STYLE[item.category ?? ''] || DEFAULT_STYLE
                        const Icon = style.icon

                        return (
                            <ListItemButton
                                key={`${item.value}-${idx}`}
                                sx={{
                                    p: 0,
                                    borderRadius: '8px',
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
                                            <Icon size={30} stroke={1.5} color={style.color} />
                                        </Box>
                                    </ListItemAvatar>
                                    <ListItemText sx={{ ml: 1 }} primary={item.label} secondary={item.description} />
                                </ListItem>
                            </ListItemButton>
                        )
                    })}
                </List>
            </Box>
        </div>
    )
}
