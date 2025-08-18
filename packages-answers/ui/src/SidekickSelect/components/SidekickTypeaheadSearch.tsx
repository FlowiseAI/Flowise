'use client'
import React, { useState, useMemo } from 'react'
import {
    Autocomplete,
    TextField,
    Box,
    Paper,
    Typography,
    Avatar,
    Chip,
    alpha,
    useTheme,
    InputAdornment,
    CircularProgress
} from '@mui/material'
import { Search as SearchIcon, Star as StarIcon, StarBorder as StarBorderIcon } from '@mui/icons-material'
import { Sidekick } from '../SidekickSelect.types'

interface SidekickTypeaheadSearchProps {
    sidekicks: Sidekick[]
    isLoading: boolean
    favorites: Set<string>
    toggleFavorite: (sidekick: Sidekick, e?: React.MouseEvent) => void
    onSidekickSelect: (sidekick: Sidekick) => void
    placeholder?: string
    enablePerformanceLogs?: boolean
    onClose?: () => void
    shouldAutoFocus?: boolean
    autoOpen?: boolean
}

interface SidekickOptionProps {
    sidekick: Sidekick
    favorites: Set<string>
    toggleFavorite: (sidekick: Sidekick, e?: React.MouseEvent) => void
    onSelect: (sidekick: Sidekick) => void
}

const SidekickOption: React.FC<SidekickOptionProps> = ({ sidekick, favorites, toggleFavorite, onSelect }) => {
    const theme = useTheme()
    const isFavorite = favorites.has(sidekick.id)

    return (
        <Paper
            sx={{
                p: 2,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.9)}, ${alpha(
                    theme.palette.background.paper,
                    0.95
                )})`,
                backdropFilter: 'blur(10px)',
                margin: '4px 0',
                borderRadius: 2,
                width: '100%',
                boxSizing: 'border-box',
                '&:hover': {
                    transform: 'translateY(-1px)',
                    boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.15)}`,
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`
                }
            }}
            onClick={() => onSelect(sidekick)}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                {/* Favorite button */}
                <Box
                    sx={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        zIndex: 2,
                        cursor: 'pointer',
                        borderRadius: '50%',
                        width: 24,
                        height: 24,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: alpha(theme.palette.background.default, 0.8),
                        '&:hover': {
                            bgcolor: alpha(theme.palette.background.default, 0.9)
                        }
                    }}
                    onClick={(e) => {
                        e.stopPropagation()
                        toggleFavorite(sidekick, e)
                    }}
                >
                    {isFavorite ? (
                        <StarIcon sx={{ fontSize: 16, color: theme.palette.warning.main }} />
                    ) : (
                        <StarBorderIcon sx={{ fontSize: 16, color: theme.palette.text.secondary }} />
                    )}
                </Box>

                {/* Avatar */}
                <Avatar
                    sx={{
                        width: 32,
                        height: 32,
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        bgcolor: theme.palette.primary.main,
                        color: theme.palette.primary.contrastText,
                        mr: 2
                    }}
                >
                    {sidekick.chatflow.name.charAt(0).toUpperCase()}
                </Avatar>

                {/* Content */}
                <Box sx={{ flex: 1, minWidth: 0, pr: 3 }}>
                    <Typography
                        variant='subtitle2'
                        sx={{
                            fontWeight: 600,
                            color: theme.palette.text.primary,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            lineHeight: 1.2,
                            mb: 0.5
                        }}
                    >
                        {sidekick.chatflow.name}
                    </Typography>

                    <Typography
                        variant='body2'
                        sx={{
                            color: theme.palette.text.secondary,
                            fontSize: '0.75rem',
                            lineHeight: 1.3,
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitBoxOrient: 'vertical',
                            WebkitLineClamp: 2,
                            mb: 1
                        }}
                    >
                        {sidekick.chatflow.description || 'No description available'}
                    </Typography>

                    {/* Tags */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {sidekick.chatflow.isOwner && (
                            <Chip
                                label='Mine'
                                size='small'
                                sx={{
                                    height: 20,
                                    fontSize: '0.625rem',
                                    bgcolor: alpha(theme.palette.success.main, 0.1),
                                    color: theme.palette.success.main,
                                    border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                                    '& .MuiChip-label': { px: 1 }
                                }}
                            />
                        )}
                        {sidekick.chatflow.category && (
                            <Chip
                                label={sidekick.chatflow.category}
                                size='small'
                                sx={{
                                    height: 20,
                                    fontSize: '0.625rem',
                                    bgcolor: alpha(theme.palette.info.main, 0.1),
                                    color: theme.palette.info.main,
                                    border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                                    '& .MuiChip-label': { px: 1 }
                                }}
                            />
                        )}
                    </Box>
                </Box>
            </Box>
        </Paper>
    )
}

const SidekickTypeaheadSearch: React.FC<SidekickTypeaheadSearchProps> = ({
    sidekicks,
    isLoading,
    favorites,
    toggleFavorite,
    onSidekickSelect,
    placeholder = 'Search for a sidekick...',
    enablePerformanceLogs = false,
    onClose,
    shouldAutoFocus = false,
    autoOpen = true
}) => {
    const [inputValue, setInputValue] = useState('')
    const [open, setOpen] = useState(autoOpen) // Start open based on autoOpen prop
    const theme = useTheme()
    const inputRef = React.useRef<HTMLInputElement>(null)

    // Filter and sort sidekicks based on search input
    const filteredSidekicks = useMemo(() => {
        if (!inputValue.trim()) {
            return sidekicks.slice(0, 10) // Show first 10 sidekicks when no search
        }

        const searchTerm = inputValue.toLowerCase()
        const filtered = sidekicks.filter((sidekick) => {
            const nameMatch = sidekick.chatflow.name.toLowerCase().includes(searchTerm)
            const descriptionMatch = sidekick.chatflow.description?.toLowerCase().includes(searchTerm)
            const categoryMatch = sidekick.chatflow.category?.toLowerCase().includes(searchTerm)
            const categoriesMatch = sidekick.categories?.some((cat) => cat.toLowerCase().includes(searchTerm))

            return nameMatch || descriptionMatch || categoryMatch || categoriesMatch
        })

        // Sort by relevance: exact name matches first, then name starts with, then other matches
        return filtered.sort((a, b) => {
            const aName = a.chatflow.name.toLowerCase()
            const bName = b.chatflow.name.toLowerCase()

            if (aName === searchTerm && bName !== searchTerm) return -1
            if (bName === searchTerm && aName !== searchTerm) return 1
            if (aName.startsWith(searchTerm) && !bName.startsWith(searchTerm)) return -1
            if (bName.startsWith(searchTerm) && !aName.startsWith(searchTerm)) return 1

            return 0
        })
    }, [sidekicks, inputValue])

    if (enablePerformanceLogs) {
        // Performance logging for filtered sidekicks
    }

    // Handle shouldAutoFocus when component mounts and ensure dropdown opens
    React.useEffect(() => {
        if (shouldAutoFocus && inputRef.current) {
            // Small delay to ensure the component is fully rendered
            setTimeout(() => {
                inputRef.current?.focus()
                setOpen(true) // Ensure dropdown is open
            }, 50)
        }
    }, [shouldAutoFocus])

    // Handle escape key
    React.useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && onClose) {
                onClose()
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => {
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [onClose])

    return (
        <Box sx={{ width: '100%', maxWidth: '400px' }}>
            <Autocomplete
                open={open}
                onOpen={() => setOpen(true)}
                onClose={(event, reason) => {
                    setOpen(false)
                    if (reason === 'escape' || reason === 'blur') {
                        onClose?.()
                    }
                }}
                options={filteredSidekicks}
                getOptionLabel={(sidekick) => sidekick.chatflow.name}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                loading={isLoading}
                inputValue={inputValue}
                onInputChange={(event, newInputValue) => {
                    setInputValue(newInputValue)
                }}
                onChange={(event, value) => {
                    if (value) {
                        onSidekickSelect(value)
                        setInputValue('')
                        setOpen(false)
                    }
                }}
                filterOptions={(x) => x} // We handle filtering ourselves
                fullWidth
                renderInput={(params) => (
                    <TextField
                        {...params}
                        fullWidth
                        variant='outlined'
                        placeholder={placeholder}
                        inputRef={inputRef}
                        InputProps={{
                            ...params.InputProps,
                            startAdornment: (
                                <InputAdornment position='start'>
                                    <SearchIcon color='action' />
                                </InputAdornment>
                            ),
                            endAdornment: (
                                <>
                                    {isLoading ? <CircularProgress color='inherit' size={20} /> : null}
                                    {params.InputProps.endAdornment}
                                </>
                            )
                        }}
                        sx={{
                            width: '100%',
                            '& .MuiOutlinedInput-root': {
                                backgroundColor: alpha(theme.palette.background.paper, 0.8),
                                backdropFilter: 'blur(10px)',
                                '&:hover': {
                                    '& .MuiOutlinedInput-notchedOutline': {
                                        borderColor: alpha(theme.palette.primary.main, 0.3)
                                    }
                                },
                                '&.Mui-focused': {
                                    '& .MuiOutlinedInput-notchedOutline': {
                                        borderColor: theme.palette.primary.main
                                    }
                                }
                            }
                        }}
                    />
                )}
                renderOption={(props, sidekick) => {
                    return (
                        <Box
                            component='li'
                            key={sidekick.id}
                            {...props}
                            sx={{ p: 0, px: '5px', '&:hover': { backgroundColor: 'transparent' } }}
                        >
                            <SidekickOption
                                sidekick={sidekick}
                                favorites={favorites}
                                toggleFavorite={toggleFavorite}
                                onSelect={onSidekickSelect}
                            />
                        </Box>
                    )
                }}
                ListboxProps={{
                    sx: {
                        maxHeight: 400,
                        bgcolor: alpha(theme.palette.background.default, 0.95),
                        backdropFilter: 'blur(20px)',
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                        borderRadius: 2,
                        p: 1
                    }
                }}
                PaperComponent={({ children, ...props }) => (
                    <Paper
                        {...props}
                        sx={{
                            bgcolor: 'transparent',
                            boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.2)}`,
                            borderRadius: 2,
                            overflow: 'hidden'
                        }}
                    >
                        {children}
                    </Paper>
                )}
                noOptionsText={
                    <Box sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant='body2' color='text.secondary'>
                            {inputValue ? `No sidekicks found for "${inputValue}"` : 'Start typing to search sidekicks...'}
                        </Typography>
                    </Box>
                }
            />
        </Box>
    )
}

export default SidekickTypeaheadSearch
