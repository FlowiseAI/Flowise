import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'

import { Divider, List, ListItem, ListItemButton, Paper, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'

/**
 * Shape of items returned by the TipTap suggestion `items()` callback.
 * Matches the UI package's SuggestionList item shape.
 */
export interface SuggestionItem {
    id: string
    /** Display label (called `mentionLabel` in the UI package) */
    label: string
    description?: string
    category?: string
}

export interface SuggestionDropdownProps {
    /** Filtered suggestion items from TipTap's suggestion plugin */
    items: SuggestionItem[]
    /** TipTap command to insert the selected mention node */
    command: (attrs: { id: string; label: string }) => void
}

/** Ref handle exposed to TipTap's suggestion `onKeyDown` callback. */
export interface SuggestionDropdownRef {
    onKeyDown: (args: { event: KeyboardEvent }) => boolean
}

/**
 * Autocomplete dropdown for TipTap mention suggestions.
 *
 * Rendered by TipTap's suggestion plugin via ReactRenderer.
 * Exposes keyboard navigation via forwardRef + useImperativeHandle
 * so the suggestion plugin can delegate keystrokes.
 *
 * Port of packages/ui/src/ui-component/input/SuggestionList.jsx to TypeScript.
 */
export const SuggestionDropdown = forwardRef<SuggestionDropdownRef, SuggestionDropdownProps>(({ items, command }, ref) => {
    const theme = useTheme()
    const [selectedIndex, setSelectedIndex] = useState(0)
    const listRef = useRef<HTMLUListElement>(null)

    // Group items by category
    const grouped = useMemo(() => {
        const groups: Record<string, SuggestionItem[]> = {}
        for (const item of items) {
            const cat = item.category ?? 'Other'
            if (!groups[cat]) groups[cat] = []
            groups[cat].push(item)
        }
        return groups
    }, [items])

    // Reset selection when items change
    useEffect(() => {
        setSelectedIndex(0)
    }, [items])

    // Scroll selected item into view
    useEffect(() => {
        if (listRef.current) {
            const selected = listRef.current.querySelector('[data-selected="true"]')
            selected?.scrollIntoView?.({ block: 'nearest' })
        }
    }, [selectedIndex])

    const selectItem = (index: number) => {
        if (index >= items.length) return
        const item = items[index]
        command({ id: item.id, label: item.label })
    }

    // Expose keyboard navigation to TipTap's suggestion plugin
    useImperativeHandle(ref, () => ({
        onKeyDown: ({ event }) => {
            if (event.key === 'ArrowUp') {
                setSelectedIndex((prev) => (prev + items.length - 1) % items.length)
                return true
            }
            if (event.key === 'ArrowDown') {
                setSelectedIndex((prev) => (prev + 1) % items.length)
                return true
            }
            if (event.key === 'Enter') {
                selectItem(selectedIndex)
                return true
            }
            return false
        }
    }))

    if (items.length === 0) return null

    return (
        <Paper
            elevation={5}
            sx={{
                maxHeight: 300,
                overflowY: 'auto',
                zIndex: theme.zIndex.modal + 1
            }}
            data-testid='suggestion-dropdown'
        >
            <List ref={listRef} dense sx={{ overflow: 'hidden', maxWidth: 300 }}>
                {Object.entries(grouped).map(([category, categoryItems], categoryIndex) => (
                    <div key={category}>
                        {categoryIndex > 0 && <Divider />}
                        <ListItem
                            sx={{
                                py: 0.5,
                                bgcolor: theme.palette.mode === 'dark' ? theme.palette.common.black : theme.palette.grey[50]
                            }}
                        >
                            <Typography variant='overline' color='text.secondary'>
                                {category}
                            </Typography>
                        </ListItem>
                        {categoryItems.map((item) => {
                            const itemIndex = items.findIndex((i) => i.id === item.id)
                            const isSelected = itemIndex === selectedIndex
                            return (
                                <ListItem key={item.id} disablePadding>
                                    <ListItemButton
                                        data-selected={isSelected}
                                        selected={isSelected}
                                        onClick={() => selectItem(itemIndex)}
                                        sx={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'flex-start'
                                        }}
                                    >
                                        <Typography variant='body1' sx={{ fontWeight: 500 }}>
                                            {item.label}
                                        </Typography>
                                        {item.description && (
                                            <Typography
                                                variant='caption'
                                                color='text.secondary'
                                                sx={{
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis'
                                                }}
                                            >
                                                {item.description}
                                            </Typography>
                                        )}
                                    </ListItemButton>
                                </ListItem>
                            )
                        })}
                    </div>
                ))}
            </List>
        </Paper>
    )
})

SuggestionDropdown.displayName = 'SuggestionDropdown'
