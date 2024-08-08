import PropTypes from 'prop-types'
import { createPortal } from 'react-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useEffect } from 'react'
import ReactJson from 'flowise-react-json-view'
import { Typography, Card, CardContent, Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material'
import StatsCard from '@/ui-component/cards/StatsCard'
import { HIDE_CANVAS_DIALOG, SHOW_CANVAS_DIALOG } from '@/store/actions'
import { IconZoomScan } from '@tabler/icons-react'

const UpsertResultDialog = ({ show, dialogProps, onCancel, onGoToRetrievalQuery }) => {
    const portalElement = document.getElementById('portal')
    const dispatch = useDispatch()
    const customization = useSelector((state) => state.customization)

    useEffect(() => {
        if (show) dispatch({ type: SHOW_CANVAS_DIALOG })
        else dispatch({ type: HIDE_CANVAS_DIALOG })
        return () => dispatch({ type: HIDE_CANVAS_DIALOG })
    }, [show, dispatch])

    const component = show ? (
        <Dialog
            onClose={onCancel}
            open={show}
            fullWidth
            maxWidth='sm'
            aria-labelledby='upsert-result-dialog-title'
            aria-describedby='upsert-result-dialog-description'
        >
            <DialogTitle sx={{ fontSize: '1rem' }} id='upsert-result-dialog-title'>
                Upsert Record
            </DialogTitle>
            <DialogContent>
                <>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                            gap: 5
                        }}
                    >
                        <StatsCard title='Added' stat={dialogProps.numAdded ?? 0} />
                        <StatsCard title='Updated' stat={dialogProps.numUpdated ?? 0} />
                        <StatsCard title='Skipped' stat={dialogProps.numSkipped ?? 0} />
                        <StatsCard title='Deleted' stat={dialogProps.numDeleted ?? 0} />
                    </div>
                    {dialogProps.addedDocs && dialogProps.addedDocs.length > 0 && (
                        <Typography sx={{ mt: 2, mb: 2, fontWeight: 500 }}>{dialogProps.numAdded} Added Documents</Typography>
                    )}
                    {dialogProps.addedDocs &&
                        dialogProps.addedDocs.length > 0 &&
                        dialogProps.addedDocs.map((docs, index) => {
                            return (
                                <Card
                                    key={index}
                                    sx={{ border: '1px solid #e0e0e0', borderRadius: `${customization.borderRadius}px`, mb: 1 }}
                                >
                                    <CardContent>
                                        <Typography sx={{ fontSize: 14 }} color='text.primary' gutterBottom>
                                            {docs.pageContent}
                                        </Typography>
                                        <ReactJson
                                            theme={customization.isDarkMode ? 'ocean' : 'rjv-default'}
                                            style={{ padding: 10, borderRadius: 10 }}
                                            src={docs.metadata}
                                            name={null}
                                            quotesOnKeys={false}
                                            enableClipboard={false}
                                            displayDataTypes={false}
                                            collapsed={true}
                                        />
                                    </CardContent>
                                </Card>
                            )
                        })}
                </>
            </DialogContent>
            <DialogActions>
                {dialogProps.goToRetrievalQuery && (
                    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', marginLeft: '15px', marginRight: '15px' }}>
                        <Button
                            variant='contained'
                            fullWidth
                            sx={{
                                borderRadius: 2,
                                height: '100%',
                                backgroundImage: `linear-gradient(to right, #3f5efb, #fc466b)`,
                                '&:hover': {
                                    backgroundImage: `linear-gradient(to right, #2b4efb, #fe2752)`
                                },
                                mb: 2
                            }}
                            startIcon={<IconZoomScan />}
                            onClick={onGoToRetrievalQuery}
                        >
                            Test Retrieval
                        </Button>
                        <Button fullWidth onClick={onCancel}>
                            Close
                        </Button>
                    </div>
                )}
                {!dialogProps.goToRetrievalQuery && <Button onClick={onCancel}>Close</Button>}
            </DialogActions>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

UpsertResultDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func,
    onGoToRetrievalQuery: PropTypes.func
}

export default UpsertResultDialog
