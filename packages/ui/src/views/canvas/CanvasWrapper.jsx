import PropTypes from 'prop-types'
import { useState } from 'react'

// material-ui
import { Tabs } from '@mui/base/Tabs'

// project imports
import { TabsList } from '@/ui-component/tabs/TabsList'
import { Tab } from '@/ui-component/tabs/Tab'

// const

const CanvasWrapper = ({ isAgentCanvas, isOpeaCanvas, children }) => {
    const [tabVal, setTabVal] = useState(0)
    return isOpeaCanvas ? (
        <>
            <Tabs
                value={tabVal}
                onChange={(event, val) => {
                    setTabVal(val)
                }}
                aria-label='tabs'
                defaultValue={0}
            >
                <TabsList>
                    {['Flow Configuration', 'Sandbox Evaluation', 'Deployment Package'].map((tabName, index) => (
                        <Tab key={index}>{tabName}</Tab>
                    ))}
                </TabsList>
            </Tabs>
            {tabVal === 0 ? (
                children
            ) : tabVal === 1 ? (
                <div>
                    <h1>Sandbox Evaluation</h1>
                </div>
            ) : tabVal === 2 ? (
                <div>
                    <h1>Deployment Package</h1>
                </div>
            ) : null}
        </>
    ) : (
        { children }
    )
}

CanvasWrapper.propTypes = {
    isAgentCanvas: PropTypes.bool,
    isOpeaCanvas: PropTypes.bool,
    children: PropTypes.node
}

export default CanvasWrapper
