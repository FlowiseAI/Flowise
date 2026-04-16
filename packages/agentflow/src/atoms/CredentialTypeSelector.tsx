import { type SyntheticEvent, useState } from 'react'

import { Box, InputAdornment, List, ListItemButton, OutlinedInput, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { IconKey, IconSearch, IconX } from '@tabler/icons-react'

import type { ComponentCredentialSchema } from '@/core/types'

export interface CredentialTypeSelectorProps {
    schemas: ComponentCredentialSchema[]
    apiBaseUrl: string
    onSelect: (schema: ComponentCredentialSchema) => void
}

/**
 * Search + grid selector for choosing a credential type.
 * Renders a search bar and a 3-column grid of credential cards with icons.
 */
export function CredentialTypeSelector({ schemas, apiBaseUrl, onSelect }: CredentialTypeSelectorProps) {
    const theme = useTheme()
    const [searchValue, setSearchValue] = useState('')

    const filtered = schemas.filter((s) => s.label.toLowerCase().includes(searchValue.toLowerCase()))

    return (
        <>
            <Box sx={{ backgroundColor: theme.palette.background.paper, pt: 2, position: 'sticky', top: 0, zIndex: 10 }}>
                <OutlinedInput
                    sx={{ width: '100%', pr: 2, pl: 2 }}
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    placeholder='Search credential'
                    startAdornment={
                        <InputAdornment position='start'>
                            <IconSearch stroke={1.5} size='1rem' color={theme.palette.grey[500]} />
                        </InputAdornment>
                    }
                    endAdornment={
                        <InputAdornment
                            position='end'
                            sx={{ cursor: 'pointer', color: theme.palette.grey[500], '&:hover': { color: theme.palette.grey[900] } }}
                            title='Clear Search'
                        >
                            <IconX stroke={1.5} size='1rem' onClick={() => setSearchValue('')} style={{ cursor: 'pointer' }} />
                        </InputAdornment>
                    }
                />
            </Box>
            <List
                sx={{
                    width: '100%',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 2,
                    py: 0,
                    zIndex: 9,
                    borderRadius: '10px',
                    [theme.breakpoints.down('md')]: {
                        maxWidth: 370
                    }
                }}
            >
                {filtered.map((schema) => (
                    <ListItemButton
                        key={schema.name}
                        onClick={() => onSelect(schema)}
                        sx={{
                            border: 1,
                            borderColor: alpha(theme.palette.grey[900], 0.25),
                            borderRadius: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'start',
                            textAlign: 'left',
                            gap: 1,
                            p: 2
                        }}
                    >
                        <CredentialIcon name={schema.name} apiBaseUrl={apiBaseUrl} />
                        <Typography>{schema.label}</Typography>
                    </ListItemButton>
                ))}
            </List>
        </>
    )
}

/** Circular credential icon with fallback to a key icon on load error. */
export function CredentialIcon({ name, apiBaseUrl }: { name: string; apiBaseUrl: string }) {
    const theme = useTheme()
    const [failed, setFailed] = useState(false)

    const handleError = (e: SyntheticEvent<HTMLImageElement>) => {
        e.currentTarget.onerror = null
        setFailed(true)
    }

    return (
        <div
            style={{
                width: 50,
                height: 50,
                borderRadius: '50%',
                backgroundColor: theme.palette.common.white,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
        >
            {failed ? (
                <IconKey size={30} stroke={1.5} />
            ) : (
                <img
                    style={{
                        width: '100%',
                        height: '100%',
                        padding: 7,
                        borderRadius: '50%',
                        objectFit: 'contain'
                    }}
                    alt={name}
                    src={`${apiBaseUrl}/api/v1/components-credentials-icon/${name}`}
                    onError={handleError}
                />
            )}
        </div>
    )
}
