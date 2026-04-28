import { List, ListItem, ListItemButton, Paper, Typography, Divider } from '@mui/material'
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { useSelector } from 'react-redux'
import { useTheme } from '@mui/material/styles'
import PropTypes from 'prop-types'

const SuggestionList = forwardRef((props, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)
    const customization = useSelector((state) => state.customization)
    const theme = useTheme()

    useEffect(() => {
        // Configure tippy to auto-adjust placement
        const tippyOptions = {
            placement: 'bottom-start',
            flip: true,
            flipOnUpdate: true,
            // Optional: you can add an offset to give some spacing
            offset: [0, 8]
        }

        // Update tippy instance with new options
        if (props.tippyInstance) {
            Object.assign(props.tippyInstance, tippyOptions)
        }
    }, [props.tippyInstance])

    const selectItem = (index) => {
        if (index >= props.items.length) {
            // Make sure we actually have enough items to select the given index. For
            // instance, if a user presses "Enter" when there are no options, the index will
            // be 0 but there won't be any items, so just ignore the callback here
            return
        }

        const suggestion = props.items[index]

        // Set all of the attributes of our Mention node based on the suggestion
        // data. The fields of `suggestion` will depend on whatever data you
        // return from your `items` function in your "suggestion" options handler.
        // Our suggestion handler returns `MentionSuggestion`s (which we've
        // indicated via SuggestionProps<MentionSuggestion>). We are passing an
        // object of the `MentionNodeAttrs` shape when calling `command` (utilized
        // by the Mention extension to create a Mention Node).
        const mentionItem = {
            id: suggestion.id,
            label: suggestion.mentionLabel
        }
        // @ts-expect-error there is currently a bug in the Tiptap SuggestionProps
        // type where if you specify the suggestion type (like
        // `SuggestionProps<MentionSuggestion>`), it will incorrectly require that
        // type variable for `command`'s argument as well (whereas instead the
        // type of that argument should be the Mention Node attributes). This
        // should be fixed once https://github.com/ueberdosis/tiptap/pull/4136 is
        // merged and we can add a separate type arg to `SuggestionProps` to
        // specify the type of the commanded selected item.
        props.command(mentionItem)
    }

    const upHandler = () => {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length)
    }

    const downHandler = () => {
        setSelectedIndex((selectedIndex + 1) % props.items.length)
    }

    const enterHandler = () => {
        selectItem(selectedIndex)
    }

    useEffect(() => setSelectedIndex(0), [props.items])

    useImperativeHandle(ref, () => ({
        onKeyDown: ({ event }) => {
            if (event.key === 'ArrowUp') {
                upHandler()
                return true
            }

            if (event.key === 'ArrowDown') {
                downHandler()
                return true
            }

            if (event.key === 'Enter') {
                enterHandler()
                return true
            }

            return false
        }
    }))

    // Group items by category
    const groupedItems = props.items.reduce((acc, item) => {
        const category = item.category || 'Other'
        if (!acc[category]) {
            acc[category] = []
        }
        acc[category].push(item)
        return acc
    }, {})

    return props.items.length > 0 ? (
        <Paper
            elevation={5}
            sx={{
                maxHeight: '300px',
                overflowY: 'auto'
            }}
        >
            <List
                dense
                sx={{
                    overflow: 'hidden',
                    maxWidth: '300px'
                }}
            >
                {Object.entries(groupedItems).map(([category, items], categoryIndex) => (
                    <div key={category}>
                        {/* Add divider before each category except the first one */}
                        {categoryIndex > 0 && <Divider />}

                        {/* Category header */}
                        <ListItem sx={{ py: 0.5, bgcolor: customization.isDarkMode ? theme.palette.common.black : theme.palette.grey[50] }}>
                            <Typography variant='overline' color='text.secondary'>
                                {category}
                            </Typography>
                        </ListItem>

                        {/* Category items */}
                        {items.map((item) => {
                            const itemIndex = props.items.findIndex((i) => i.id === item.id)
                            return (
                                <ListItem key={item.id} disablePadding>
                                    <ListItemButton
                                        selected={itemIndex === selectedIndex}
                                        onClick={() => selectItem(itemIndex)}
                                        sx={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'flex-start'
                                        }}
                                    >
                                        <Typography variant='body1' sx={{ fontWeight: 500 }}>
                                            {item.label || item.mentionLabel}
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
    ) : null
})

SuggestionList.displayName = 'SuggestionList'

// Add PropTypes validation
SuggestionList.propTypes = {
    items: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.string.isRequired,
            mentionLabel: PropTypes.string.isRequired,
            label: PropTypes.string,
            description: PropTypes.string,
            category: PropTypes.string
        })
    ).isRequired,
    command: PropTypes.func.isRequired,
    tippyInstance: PropTypes.object
}

export default SuggestionList
