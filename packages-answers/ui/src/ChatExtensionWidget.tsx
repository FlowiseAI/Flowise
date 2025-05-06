import Box from '@mui/material/Box'

import Fab from '@mui/material/Fab'

import SaveIcon from '@mui/icons-material/Save'

import { User } from 'types'
interface ChatExtensionWidgetProps {
    user?: User
}
const ChatExtensionWidget = ({ user }: ChatExtensionWidgetProps) => {
    // const { syncURLs } = useAnswers();

    const handleSavePage = async () => {
        const url = window.location.href
        // await syncURLs({ urls: [url] });
    }
    return (
        <Box
            sx={{
                position: 'fixed',
                zIndex: 1000000,
                top: 0,
                left: 0,
                height: '100%',
                width: '100%',
                pointerEvents: 'none',
                display: 'flex',
                '>*': {
                    pointerEvents: 'auto'
                }
            }}
        >
            <Box
                sx={{
                    position: 'absolute',
                    bottom: 80,
                    right: 16
                }}
            >
                <Fab onClick={handleSavePage} variant='extended' color='primary' aria-label='add'>
                    <SaveIcon />
                </Fab>
            </Box>
        </Box>
    )
}

export default ChatExtensionWidget
