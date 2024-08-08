import * as React from 'react'

import Box from '@mui/material/Box'
import List from '@mui/material/List'
import Paper from '@mui/material/Paper'
interface SelectedListItemProps {
    items: { text: string; icon: React.ReactElement; link: string }[]
    handleSelected?: (item: any) => void
    sx?: any
    renderItem: (item: any, selected: boolean) => React.ReactElement
}
export default function SelectedListItem({ items, handleSelected, sx, renderItem }: SelectedListItemProps) {
    const [selectedIndex, setSelectedIndex] = React.useState(0)
    // const { pathname } = useRouter();
    return (
        <Box sx={{ ...sx }}>
            <Paper>
                <List component='nav'>
                    {items?.map((item, idx) => renderItem(item, selectedIndex === idx))}
                    {/* {items?.map((item, idx) => (
            <NextLink
              passHref
              href={item.link}
              key={item.text}
              onClick={() => handleListItemClick(idx)}>
              {renderItem(item, selectedIndex === idx)}
            </NextLink>
          ))} */}
                </List>
            </Paper>
        </Box>
    )
}
