import PropTypes from 'prop-types'
import { useState } from 'react'

// material-ui
import { styled, useTheme } from '@mui/material/styles'
import { Box, Typography, Divider, Button } from '@mui/material'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import NodeInputHandler from '@/views/canvas/NodeInputHandler'
import NodeOutputHandler from '@/views/canvas/NodeOutputHandler'
import AdditionalParamsDialog from '@/ui-component/dialog/AdditionalParamsDialog'

// const
import { baseURL } from '@/store/constant'
import LlamaindexPNG from '@/assets/images/llamaindex.png'

const CardWrapper = styled(MainCard)(({ theme }) => ({
    background: theme.palette.card.main,
    color: theme.darkTextPrimary,
    border: 'solid 1px',
    borderColor: theme.palette.primary[200] + 75,
    width: '300px',
    height: 'auto',
    padding: '10px',
    boxShadow: '0 2px 14px 0 rgb(32 40 45 / 8%)',
    '&:hover': {
        borderColor: theme.palette.primary.main
    }
}))

// ===========================|| CANVAS NODE ||=========================== //

const MarketplaceCanvasNode = ({ data }) => {
    const theme = useTheme()

    const [showDialog, setShowDialog] = useState(false)
    const [dialogProps, setDialogProps] = useState({})

    const onDialogClicked = () => {
        const dialogProps = {
            data,
            inputParams: data.inputParams.filter((param) => param.additionalParams),
            disabled: true,
            confirmButtonName: 'Save',
            cancelButtonName: 'Cancel'
        }
        setDialogProps(dialogProps)
        setShowDialog(true)
    }

    return (
        <>
            <CardWrapper
                content={false}
                sx={{
                    padding: 0,
                    borderColor: data.selected ? theme.palette.primary.main : theme.palette.text.secondary
                }}
                border={false}
            >
                <Box>
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                        <Box style={{ width: 50, marginRight: 10, padding: 5 }}>
                            <div
                                style={{
                                    ...theme.typography.commonAvatar,
                                    ...theme.typography.largeAvatar,
                                    borderRadius: '50%',
                                    backgroundColor: 'white',
                                    cursor: 'grab'
                                }}
                            >
                                <img
                                    style={{ width: '100%', height: '100%', padding: 5, objectFit: 'contain' }}
                                    src={`${baseURL}/api/v1/node-icon/${data.name}`}
                                    alt='Notification'
                                />
                            </div>
                        </Box>
                        <Box>
                            <Typography
                                sx={{
                                    fontSize: '1rem',
                                    fontWeight: 500
                                }}
                            >
                                {data.label}
                            </Typography>
                        </Box>
                        <div style={{ flexGrow: 1 }}></div>
                        {data.tags && data.tags.includes('LlamaIndex') && (
                            <>
                                <div
                                    style={{
                                        borderRadius: '50%',
                                        padding: 15
                                    }}
                                >
                                    <img
                                        style={{ width: '25px', height: '25px', borderRadius: '50%', objectFit: 'contain' }}
                                        src={LlamaindexPNG}
                                        alt='LlamaIndex'
                                    />
                                </div>
                            </>
                        )}
                    </div>
                    {(data.inputAnchors.length > 0 || data.inputParams.length > 0) && (
                        <>
                            <Divider />
                            <Box sx={{ background: theme.palette.asyncSelect.main, p: 1 }}>
                                <Typography
                                    sx={{
                                        fontWeight: 500,
                                        textAlign: 'center'
                                    }}
                                >
                                    Inputs
                                </Typography>
                            </Box>
                            <Divider />
                        </>
                    )}
                    {data.inputAnchors.map((inputAnchor, index) => (
                        <NodeInputHandler disabled={true} key={index} inputAnchor={inputAnchor} data={data} />
                    ))}
                    {data.inputParams.map((inputParam, index) => (
                        <NodeInputHandler disabled={true} key={index} inputParam={inputParam} data={data} />
                    ))}
                    {data.inputParams.find((param) => param.additionalParams) && (
                        <div
                            style={{
                                textAlign: 'center',
                                marginTop:
                                    data.inputParams.filter((param) => param.additionalParams).length ===
                                    data.inputParams.length + data.inputAnchors.length
                                        ? 20
                                        : 0
                            }}
                        >
                            <Button sx={{ borderRadius: 25, width: '90%', mb: 2 }} variant='outlined' onClick={onDialogClicked}>
                                Additional Parameters
                            </Button>
                        </div>
                    )}
                    <Divider />
                    <Box sx={{ background: theme.palette.asyncSelect.main, p: 1 }}>
                        <Typography
                            sx={{
                                fontWeight: 500,
                                textAlign: 'center'
                            }}
                        >
                            Output
                        </Typography>
                    </Box>
                    <Divider />

                    {data.outputAnchors.map((outputAnchor, index) => (
                        <NodeOutputHandler disabled={true} key={index} outputAnchor={outputAnchor} data={data} />
                    ))}
                </Box>
            </CardWrapper>
            <AdditionalParamsDialog
                show={showDialog}
                dialogProps={dialogProps}
                onCancel={() => setShowDialog(false)}
            ></AdditionalParamsDialog>
        </>
    )
}

MarketplaceCanvasNode.propTypes = {
    data: PropTypes.object
}

export default MarketplaceCanvasNode
