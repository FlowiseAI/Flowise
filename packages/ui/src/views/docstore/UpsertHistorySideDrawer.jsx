import { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import moment from 'moment/moment'

import { Stack, Button, Box, SwipeableDrawer } from '@mui/material'
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
import HistoryEmptySVG from '@/assets/images/upsert_history_empty.svg'
import vectorstoreApi from '@/api/vectorstore'
import useApi from '@/hooks/useApi'

const UpsertHistorySideDrawer = ({ show, dialogProps, onClickFunction, onSelectHistoryDetails }) => {
    const onOpen = () => {}
    const [upsertHistory, setUpsertHistory] = useState([])

    const getUpsertHistoryApi = useApi(vectorstoreApi.getUpsertHistory)

    useEffect(() => {
        getUpsertHistoryApi.request(dialogProps.id)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dialogProps])

    useEffect(() => {
        if (getUpsertHistoryApi.data) {
            setUpsertHistory(getUpsertHistoryApi.data)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getUpsertHistoryApi.data])

    return (
        <>
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
                        {upsertHistory &&
                            upsertHistory.map((history, index) => (
                                <TimelineItem key={index}>
                                    <TimelineOppositeContent>
                                        {moment(history.date).format('DD-MMM-YYYY, hh:mm:ss A')}
                                    </TimelineOppositeContent>
                                    <TimelineSeparator style={{ marginTop: 5 }}>
                                        <TimelineDot />
                                        {index !== upsertHistory.length - 1 && <TimelineConnector />}
                                    </TimelineSeparator>
                                    <TimelineContent>
                                        {history.result.numAdded !== undefined && history.result.numAdded > 0 && (
                                            <Box sx={{ fontWeight: 500 }}>Added: {history.result.numAdded}</Box>
                                        )}
                                        {history.result.numUpdated !== undefined && history.result.numUpdated > 0 && (
                                            <Box sx={{ fontWeight: 500 }}>Updated: {history.result.numUpdated}</Box>
                                        )}
                                        {history.result.numSkipped !== undefined && history.result.numSkipped > 0 && (
                                            <Box sx={{ fontWeight: 500 }}>Skipped: {history.result.numSkipped}</Box>
                                        )}
                                        {history.result.numDeleted !== undefined && history.result.numDeleted > 0 && (
                                            <Box sx={{ fontWeight: 500 }}>Deleted: {history.result.numDeleted}</Box>
                                        )}
                                        <Button
                                            size='small'
                                            sx={{ mt: 1, mb: 3, borderRadius: '25px' }}
                                            variant='outlined'
                                            onClick={() => onSelectHistoryDetails(history)}
                                        >
                                            Details
                                        </Button>
                                    </TimelineContent>
                                </TimelineItem>
                            ))}
                        {upsertHistory.length === 0 && (
                            <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection='column'>
                                <Box sx={{ pb: 2, height: 'auto' }}>
                                    <img
                                        style={{ objectFit: 'cover', height: '10vh', width: 'auto' }}
                                        src={HistoryEmptySVG}
                                        alt='HistoryEmptySVG'
                                    />
                                </Box>
                                <div>No Upsert History Yet</div>
                            </Stack>
                        )}
                    </Timeline>
                </Box>
            </SwipeableDrawer>
        </>
    )
}

UpsertHistorySideDrawer.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onClickFunction: PropTypes.func,
    onSelectHistoryDetails: PropTypes.func
}

export default UpsertHistorySideDrawer
