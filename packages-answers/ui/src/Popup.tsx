import React from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'

import useAI, { syncAi } from '../../../apps/web-extension/src/useAI'
var activeTabId: any
//@ts-ignore

const getCleanedUrl = (url?: string) => (url ? url.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/[/\\]/g, '') : '')

chrome.tabs.onActivated.addListener(function (activeInfo) {
    activeTabId = activeInfo.tabId
})

async function getActiveTab() {
    //@ts-ignore

    const [tab] = await chrome.tabs.query({ currentWindow: true, active: true })

    if (tab) {
        return tab
    } else {
        //@ts-ignore
        return chrome.tabs.get(activeTabId)
    }
}

const Popup = () => {
    const [namespace, setNamespace] = React.useState('web')
    const [inputValue, setInputValue] = React.useState('')

    const handleChange = async (_event: React.MouseEvent<HTMLElement>, newNamespace: string) => {
        setNamespace(newNamespace)
        let tab = await getActiveTab()

        if (tab) {
            if (newNamespace === 'currentPage') {
                // setFilter({ cleanedUrl: getCleanedUrl(tab.url) });
                await syncAi({ url: tab.url })
            } else if (newNamespace === 'currentDomain') {
                // TODO: Pull by domain
                // setFilter({ cleanedUrl: getCleanedUrl(tab.url) });
            }
        }
    }

    React.useEffect(() => {
        ;(async () => {
            let tab = await getActiveTab()

            if (tab) {
                await syncAi({ url: tab.url })
            }
        })()
    }, [])

    const { generatedResponse, generateResponse, answers, setPrompt, addAnswer } = useAI({
        useStreaming: false
    })

    const handleSubmit = async () => {
        if (!inputValue) return

        // let queryOptions = { active: true, lastFocusedWindow: true };
        let tab = await getActiveTab()

        if (tab) {
            // setFilter({ cleanedUrl: getCleanedUrl(tab.url) }); // TODO: update if it should be more general
            // setPrompt(inputValue);
            // addAnswer({ prompt: inputValue });

            setInputValue('')
            generateResponse(inputValue, { cleanedUrl: getCleanedUrl(tab.url) })
        }
    }

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(event.target.value)
    }

    const handleSummarize = async () => {
        // let queryOptions = { active: true, lastFocusedWindow: true };
        //@ts-ignore
        let tab = await getActiveTab()

        if (tab) {
            // const content = turndownService.turndown('<h1>Hello world!</h1>');

            // let prompt = `Summarize this page: ${content}`;
            let prompt = `Summarize`
            let filter = { cleanedUrl: getCleanedUrl(tab.url) }
            // setFilter(filter);
            setPrompt(prompt)
            addAnswer({ prompt })

            setInputValue('Summarize')
            generateResponse(prompt, filter)
        }
    }

    React.useEffect(() => {
        const messageListener = (message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
            // 2. A page requested user data, respond with a copy of `user`
            // console.log('Message', message, sender, sendResponse);
        }
        chrome.runtime.onMessage.addListener(messageListener)
        return () => {
            chrome.runtime.onMessage.removeListener(messageListener)
        }
    }, [])

    return (
        <Box
            sx={{
                minWidth: 420,
                py: 2,
                px: 2,
                gap: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
            }}
        >
            <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
                <Typography variant='h5'>Answers AI</Typography>
                <Button variant='contained' color='secondary' onClick={handleSummarize}>
                    Summarize
                </Button>
            </Box>
            <TextField
                variant={'outlined'}
                fullWidth
                placeholder='Ask anything...'
                onKeyPress={(e) => (e.key === 'Enter' ? handleSubmit() : null)}
                onChange={handleInputChange}
            />
            <ToggleButtonGroup color='secondary' value={namespace} exclusive onChange={handleChange} aria-label='Filter'>
                {/* <ToggleButton value="internet">Internet</ToggleButton> */}
                <ToggleButton value='currentPage'>This page</ToggleButton>
                <ToggleButton value='currentDomain'>This domain</ToggleButton>
            </ToggleButtonGroup>

            {answers?.length
                ? answers.map((answer: any) => (
                      <Typography
                          key={answer?.id}
                          sx={{
                              whiteSpace: 'pre-line'
                          }}
                          variant='subtitle1'
                          color='text.secondary'
                          component='div'
                      >
                          <span dangerouslySetInnerHTML={{ __html: answer?.answer }} />
                      </Typography>
                  ))
                : null}

            {generatedResponse?.answer && (
                <Typography
                    sx={{
                        whiteSpace: 'pre-line'
                    }}
                    variant='subtitle1'
                    color='text.secondary'
                    component='div'
                >
                    <span dangerouslySetInnerHTML={{ __html: generatedResponse?.answer }} />
                </Typography>
            )}
        </Box>
    )
}

export default Popup
