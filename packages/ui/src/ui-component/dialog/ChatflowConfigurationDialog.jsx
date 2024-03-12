import PropTypes from 'prop-types'
import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { createPortal } from 'react-dom'
import { Box, Dialog, DialogContent, DialogTitle, Tabs, Tab } from '@mui/material'
import SpeechToText from './SpeechToText'
import Configuration from '@/views/chatflows/Configuration'
import AllowedDomains from './AllowedDomains'
import ChatFeedback from './ChatFeedback'
import AnalyseFlow from './AnalyseFlow'
import StarterPrompts from './StarterPrompts'

const CHATFLOW_CONFIGURATION_TABS = [
    {
        label: 'Rate Limiting',
        id: 'rateLimiting'
    },
    {
        label: 'Starter Prompts',
        id: 'conversationStarters'
    },
    {
        label: 'Speech to Text',
        id: 'speechToText'
    },
    {
        label: 'Chat Feedback',
        id: 'chatFeedback'
    },
    {
        label: 'Allowed Domains',
        id: 'allowedDomains'
    },
    {
        label: 'Analyse Chatflow',
        id: 'analyseChatflow'
    }
]

function TabPanel(props) {
    const { children, value, index, ...other } = props
    return (
        <div
            role='tabpanel'
            hidden={value !== index}
            id={`chatflow-config-tabpanel-${index}`}
            aria-labelledby={`chatflow-config-tab-${index}`}
            style={{ width: '100%', paddingTop: '1rem' }}
            {...other}
        >
            {value === index && <Box sx={{ p: 1 }}>{children}</Box>}
        </div>
    )
}

TabPanel.propTypes = {
    children: PropTypes.node,
    index: PropTypes.number.isRequired,
    value: PropTypes.number.isRequired
}

function a11yProps(index) {
    return {
        id: `chatflow-config-tab-${index}`,
        'aria-controls': `chatflow-config-tabpanel-${index}`
    }
}

const ChatflowConfigurationDialog = ({ show, dialogProps, onCancel }) => {
    const portalElement = document.getElementById('portal')
    const [tabValue, setTabValue] = useState(0)

    const canvas = useSelector((state) => state.canvas)
    const [canvasDataStore, setCanvasDataStore] = useState(canvas)
    const [chatflow, setChatflow] = useState(null)

    useEffect(() => {
        setCanvasDataStore(canvas)
    }, [canvas])

    useEffect(() => {
        setChatflow(canvasDataStore.chatflow)
    }, [canvasDataStore.chatflow])

    const component = show ? (
        <Dialog
            onClose={onCancel}
            open={show}
            fullWidth
            maxWidth={'md'}
            aria-labelledby='alert-dialog-title'
            aria-describedby='alert-dialog-description'
        >
            <DialogTitle sx={{ fontSize: '1rem' }} id='alert-dialog-title'>
                <div style={{ display: 'flex', flexDirection: 'row' }}>{dialogProps.title}</div>
            </DialogTitle>
            <DialogContent>
                <Tabs
                    sx={{ position: 'relative', minHeight: '40px', height: '40px' }}
                    value={tabValue}
                    onChange={(event, value) => setTabValue(value)}
                    aria-label='tabs'
                >
                    {CHATFLOW_CONFIGURATION_TABS.map((item, index) => (
                        <Tab
                            sx={{ minHeight: '40px', height: '40px', textAlign: 'left', display: 'flex', alignItems: 'start', mb: 1 }}
                            key={index}
                            label={item.label}
                            {...a11yProps(index)}
                        ></Tab>
                    ))}
                </Tabs>
                {CHATFLOW_CONFIGURATION_TABS.map((item, index) => (
                    <TabPanel key={index} value={tabValue} index={index}>
                        {item.id === 'rateLimiting' && <Configuration />}
                        {item.id === 'conversationStarters' ? <StarterPrompts dialogProps={{ chatflow }} /> : null}
                        {item.id === 'speechToText' ? <SpeechToText dialogProps={{ chatflow }} /> : null}
                        {item.id === 'chatFeedback' ? <ChatFeedback dialogProps={{ chatflow }} /> : null}
                        {item.id === 'allowedDomains' ? <AllowedDomains dialogProps={{ chatflow }} /> : null}
                        {item.id === 'analyseChatflow' ? <AnalyseFlow dialogProps={{ chatflow }} /> : null}
                    </TabPanel>
                ))}
            </DialogContent>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

ChatflowConfigurationDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func
}

export default ChatflowConfigurationDialog
