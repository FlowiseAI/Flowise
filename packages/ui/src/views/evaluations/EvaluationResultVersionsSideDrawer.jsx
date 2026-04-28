import { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import moment from 'moment/moment'

import { Button, Box, SwipeableDrawer } from '@mui/material'
import { IconSquareRoundedChevronsRight } from '@tabler/icons-react'
import {
    Timeline,
    TimelineConnector,
    TimelineContent,
    TimelineDot,
    TimelineItem,
    TimelineOppositeContent,
    timelineOppositeContentClasses,
    TimelineSeparator
} from '@mui/lab'

import evaluationApi from '@/api/evaluations'
import useApi from '@/hooks/useApi'

const EvaluationResultVersionsSideDrawer = ({ show, dialogProps, onClickFunction, onSelectVersion }) => {
    const onOpen = () => {}
    const [versions, setVersions] = useState([])

    const getVersionsApi = useApi(evaluationApi.getVersions)

    useEffect(() => {
        getVersionsApi.request(dialogProps.id)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dialogProps])

    useEffect(() => {
        if (getVersionsApi.data) {
            setVersions(getVersionsApi.data.versions)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getVersionsApi.data])

    const navigateToEvaluationResult = (id) => {
        onSelectVersion(id)
    }

    return (
        <SwipeableDrawer anchor='right' open={show} onClose={() => onClickFunction()} onOpen={onOpen}>
            <Button startIcon={<IconSquareRoundedChevronsRight />} onClick={() => onClickFunction()}>
                Close
            </Button>
            <Box style={{ width: 350, margin: 10 }} role='presentation' onClick={onClickFunction}>
                <Timeline
                    sx={{
                        [`& .${timelineOppositeContentClasses.root}`]: {
                            flex: 1
                        }
                    }}
                >
                    {versions &&
                        versions.map((version, index) => (
                            <TimelineItem key={index}>
                                <TimelineOppositeContent color='textSecondary'>
                                    {moment(version.runDate).format('DD-MMM-YYYY, hh:mm:ss A')}
                                </TimelineOppositeContent>
                                <TimelineSeparator style={{ marginTop: 5 }}>
                                    <TimelineDot />
                                    {index !== versions.length - 1 && <TimelineConnector />}
                                </TimelineSeparator>
                                <TimelineContent>
                                    <Button onClick={() => navigateToEvaluationResult(`${version.id}`)}>Version {version.version}</Button>
                                </TimelineContent>
                            </TimelineItem>
                        ))}
                </Timeline>
            </Box>
        </SwipeableDrawer>
    )
}

EvaluationResultVersionsSideDrawer.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onClickFunction: PropTypes.func,
    onSelectVersion: PropTypes.func
}

export default EvaluationResultVersionsSideDrawer
