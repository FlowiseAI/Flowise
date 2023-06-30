import { useSelector } from 'react-redux'
import { Stack } from '@mui/material'
import MainCard from 'ui-component/cards/MainCard'
import { useTheme } from '@mui/material/styles'
import ChatLogsTable from './ChatLogsTable'

export default function ChatLogs() {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)

    return (
        <MainCard sx={{ background: customization.isDarkMode ? theme.palette.common.black : '' }}>
            <Stack flexDirection='row'>
                <h1>Chat Logs </h1>
            </Stack>
            <ChatLogsTable />
        </MainCard>
    )
}
