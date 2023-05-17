import { createPortal } from 'react-dom'
import { useState, useEffect, useRef } from 'react'
import PropTypes from 'prop-types'

import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Tab, Tabs, Box, OutlinedInput, Select, MenuItem } from '@mui/material'
import { StyledButton } from 'ui-component/button/StyledButton'
import EmbedSVG from 'assets/images/embed.svg'
import { styled } from '@mui/material/styles';
import { DOMAIN, ROBOT_PATH } from 'utils/consts'

const Bold = styled('span')(({ theme }) => ({
    ...theme.typography.button,
    backgroundColor: theme.palette.background.paper,
    padding: theme.spacing(1),
  }));

function a11yProps(index) {
    return {
        id: `attachment-tab-${index}`,
        'aria-controls': `attachment-tabpanel-${index}`
    }
}

function TabPanel(props) {
    const { children, value, index, ...other } = props
    return (
        <div
            role='tabpanel'
            hidden={value !== index}
            id={`attachment-tabpanel-${index}`}
            aria-labelledby={`attachment-tab-${index}`}
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

const shareTabsMap = {
    钉钉机器人: '将 AI 应用接入到钉钉机器人',
    'H5 应用': '将 AI 应用以 H5 的形式分享给他人使用',
    API: '将 AI 应用以 API 的形式分享给他人使用'
}

const ShareFlowDialog = ({ show, dialogProps, onCancel }) => {
    const portalElement = document.getElementById('portal')
    const [value, setValue] = useState(0)
    const [robotAppKey, setRobotAppKey] = useState('')
    const [robotAppSecret, setRobotAppSecret] = useState('')
    const [robotType, setRobotType] = useState(1)
    const [editRobot, setEditRobot] = useState(false)
    const input = useRef(null)

    const handleChange = (event, newValue) => {
        setValue(newValue)
    }

    const onEditRobot = () => {
        if (editRobot) {
            // 保存到数据库
            // robotAppSecret robotAppKey
            debugger
            dialogProps.handleSaveFlow(dialogProps.flowName, { robot: JSON.stringify({ robotAppKey, robotAppSecret })})
            setEditRobot(false)
            return
        }
        setEditRobot(true)
    }

    const onCopyRobot = () => {
        navigator.clipboard.writeText(`${DOMAIN}${ROBOT_PATH}${dialogProps.chatflowid}`)
    }

    useEffect(() => {
        if (!dialogProps.robot) {
            return
        }
        const robot = JSON.parse(dialogProps?.robot || '{}')
        setRobotAppKey(robot.robotAppKey || '')
        setRobotAppSecret(robot.robotAppSecret || '')
    }, [dialogProps.robot])

    const component = show ? (
        <Dialog
            open={show}
            fullWidth
            maxWidth='xs'
            onClose={onCancel}
            aria-labelledby='alert-dialog-title'
            aria-describedby='alert-dialog-description'
        >
            <DialogTitle sx={{ fontSize: '1rem' }} id='alert-dialog-title'>
                {dialogProps.title}
            </DialogTitle>
            <DialogContent>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                    <div style={{ flex: 80 }}>
                        <Tabs value={value} onChange={handleChange} aria-label='tabs'>
                            {Object.keys(shareTabsMap).map((codeLang, index) => (
                                <Tab
                                    icon={<img style={{ objectFit: 'cover', height: 15, width: 'auto' }} src={EmbedSVG} alt='code' />}
                                    iconPosition='start'
                                    key={index}
                                    label={codeLang}
                                    {...a11yProps(index)}
                                />
                            ))}
                        </Tabs>
                    </div>
                </div>
                <div style={{ marginTop: 10 }}></div>
                {Object.keys(shareTabsMap).map((codeLang, index) => (
                    <TabPanel key={index} value={value} index={index}>
                        <p>{shareTabsMap[codeLang]}</p>
                        {
                            value === 0 ? (
                                <>
                                    <Select
                                        labelId='demo-simple-select-label'
                                        id='demo-simple-select'
                                        value={robotType}
                                        label='机器人类型'
                                        onChange={(e) => setRobotType(e.target.value)}
                                    >
                                        <MenuItem value={1}>应用机器人</MenuItem>
                                        <MenuItem value={2}>群内自定义机器人</MenuItem>
                                    </Select>
                                    {
                                        robotType === 1 ? (
                                            <>
                                                <p><Bold>STEP1: </Bold>将应用的 AppKey 和 AppSecret 填写到下方表单中</p>
                                                <OutlinedInput
                                                    ref={input}
                                                    sx={{ mt: 1 }}
                                                    id='chatflow-name'
                                                    type='text'
                                                    fullWidth
                                                    disabled={!editRobot}
                                                    required
                                                    placeholder='请填入机器人所属应用 AppKey'
                                                    value={robotAppKey}
                                                    onChange={(e) => setRobotAppKey(e.target.value)}
                                                />
                                                <OutlinedInput
                                                    sx={{ mt: 1 }}
                                                    id='chatflow-name'
                                                    type='text'
                                                    disabled={!editRobot}
                                                    required
                                                    fullWidth
                                                    placeholder='请填入机器人所属应用 AppSecret'
                                                    value={robotAppSecret}
                                                    onChange={(e) => setRobotAppSecret(e.target.value)}
                                                />
                                                <Button style={{ marginTop: '10px' }} variant="outlined" onClick={onEditRobot}>{editRobot ? '保存' : '编辑'}</Button>
                                                <p><Bold>STEP2: </Bold>点击<Button size="medium" onClick={onCopyRobot}>复制链接</Button>，将连接填写到机器人管理后台「消息接收地址」输入框中</p>
                                            </>
                                        ) : null
                                    }
                                </>
                            ) : null
                        }
                    </TabPanel>
                ))}
            </DialogContent>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

ShareFlowDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func
}

export default ShareFlowDialog
