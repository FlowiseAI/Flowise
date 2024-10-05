import PropTypes from 'prop-types'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Box, Dialog, DialogContent, DialogTitle, Tabs, Tab } from '@mui/material'
import { tabsClasses } from '@mui/material/Tabs'
import SpeechToText from '@/ui-component/extended/SpeechToText'
import RateLimit from '@/ui-component/extended/RateLimit'
import AllowedDomains from '@/ui-component/extended/AllowedDomains'
import ChatFeedback from '@/ui-component/extended/ChatFeedback'
import AnalyseFlow from '@/ui-component/extended/AnalyseFlow'
import StarterPrompts from '@/ui-component/extended/StarterPrompts'
import Leads from '@/ui-component/extended/Leads'
import FollowUpPrompts from '@/ui-component/extended/FollowUpPrompts'
import FileUpload from '@/ui-component/extended/FileUpload'

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
        label: 'Follow-up Prompts',
        id: 'followUpPrompts'
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
    },
    {
        label: 'Leads',
        id: 'leads'
    },
    {
        label: 'File Upload',
        id: 'fileUpload'
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
                    sx={{
                        position: 'relative',
                        minHeight: '40px',
                        height: '40px',
                        [`& .${tabsClasses.scrollButtons}`]: {
                            '&.Mui-disabled': { opacity: 0.3 }
                        }
                    }}
                    value={tabValue}
                    onChange={(event, value) => setTabValue(value)}
                    aria-label='tabs'
                    variant='scrollable'
                    scrollButtons='auto'
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
                        {item.id === 'rateLimiting' && <RateLimit />}
                        {item.id === 'conversationStarters' ? <StarterPrompts dialogProps={dialogProps} /> : null}
                        {item.id === 'followUpPrompts' ? <FollowUpPrompts dialogProps={dialogProps} /> : null}
                        {item.id === 'speechToText' ? <SpeechToText dialogProps={dialogProps} /> : null}
                        {item.id === 'chatFeedback' ? <ChatFeedback dialogProps={dialogProps} /> : null}
                        {item.id === 'allowedDomains' ? <AllowedDomains dialogProps={dialogProps} /> : null}
                        {item.id === 'analyseChatflow' ? <AnalyseFlow dialogProps={dialogProps} /> : null}
                        {item.id === 'leads' ? <Leads dialogProps={dialogProps} /> : null}
                        {item.id === 'fileUpload' ? <FileUpload dialogProps={dialogProps} /> : null}
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
