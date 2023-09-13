import { useSelector } from 'react-redux'
import { Stack } from '@mui/material'
import MainCard from 'ui-component/cards/MainCard'
import { useTheme } from '@mui/material/styles'
import ChainLogsTable from './ChainLogs'

export default function ChainLogs() {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)

    return (
        <MainCard sx={{ background: customization.isDarkMode ? theme.palette.common.black : '' }}>
            <Stack flexDirection='row'>
                <h1>Chain Logs</h1>
            </Stack>
            <ChainLogsTable />
        </MainCard>
    )
}
