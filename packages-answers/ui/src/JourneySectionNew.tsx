import NextLink from 'next/link'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'

import TreeView from '@mui/lab/TreeView'
import TreeItem from '@mui/lab/TreeItem'

import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'

import { Journey } from 'types'

interface Props {
    journeys?: Journey[]
}

function JourneySection({ journeys }: Props) {
    if (!journeys) {
        return (
            <Box>
                <Typography variant='h6'>No journeys yet</Typography>
                <Typography>To start a journey select your data sources and ask a question</Typography>
            </Box>
        )
    }
    return (
        <Box>
            <Typography variant='overline'>Journey{journeys && journeys?.length > 1 ? 's' : ''}</Typography>

            <>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 2 }}>
                    <TreeView
                        aria-label='file system navigator'
                        defaultCollapseIcon={<ExpandMoreIcon />}
                        defaultExpandIcon={<ChevronRightIcon />}
                        sx={{ height: 240, flexGrow: 1, maxWidth: 400, overflowY: 'auto' }}
                    >
                        {journeys?.map(({ id, title, filters, chats }) => (
                            <NextLink href={`/journey/${id}`} key={`journey-${id}`}>
                                <TreeItem nodeId='1' label={title}>
                                    {chats?.map((chat) => (
                                        <NextLink href={`/chat/${chat.id}`} key={`chat-${chat.id}`}>
                                            <TreeItem nodeId='2' label={chat.prompt?.content} /> d
                                        </NextLink>
                                    ))}
                                </TreeItem>
                            </NextLink>
                        ))}
                    </TreeView>
                    {/* {title ? <Typography variant="h6">{title}</Typography> : null}
            <Filters/>
            <Box
              sx={{
                width: '100%',
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { md: 'repeat(3, minmax(0px, 1fr))', sm: '1fr' }
              }}>
              {chats?.map((chat) => (
                <ChatCard {...chat} />
              ))}

              <Button
                component={NextLink}
                href={`/journey/${id}`}
                variant="outlined"
                color="primary">
                <MessageIcon />
              </Button>
            </Box> */}
                </Box>
            </>
        </Box>
    )
}

const Filters = ({ filters, sx }: { filters: any; sx?: any }) => {
    return filters ? (
        <Box sx={{ display: 'flex', gap: 1, ...sx }}>
            {Object.keys(filters)?.map((filter) =>
                filters[filter]?.length ? <Chip key={`${filter}`} label={filters[filter]?.join(', ')} /> : null
            )}
        </Box>
    ) : null
}

export default JourneySection
