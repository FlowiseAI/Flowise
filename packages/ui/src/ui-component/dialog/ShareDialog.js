import { createPortal } from 'react-dom'
import { useState, useEffect, useRef } from 'react'
import PropTypes from 'prop-types'

import { Button, Dialog, DialogContent, DialogTitle, Tab, Tabs, Box, OutlinedInput, Select, MenuItem } from '@mui/material'
import EmbedSVG from 'assets/images/embed.svg'
import { styled } from '@mui/material/styles'
import { DOMAIN, ROBOT_PATH, OUTGOING_ROBOT_PATH } from 'utils/consts'
import { CopyBlock, atomOneDark } from 'react-code-blocks'


const Bold = styled('span')(({ theme }) => ({
    ...theme.typography.button,
    backgroundColor: theme.palette.background.paper,
    padding: theme.spacing(1)
}))

function a11yProps(index) {
    return {
        id: `attachment-tab-${index}`,
        'aria-controls': `attachment-tabpanel-${index}`
    }
}

function generateToken() {
    let token = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < 10; i++) {
      token += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return token;
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

const ShareFlowDialog = ({ show, dialogProps, onCancel, handleSaveOutgoing }) => {
    const portalElement = document.getElementById('portal')
    const [value, setValue] = useState(0)
    const [robotAppKey, setRobotAppKey] = useState('')
    const [robotAppSecret, setRobotAppSecret] = useState('')
    const [robotType, setRobotType] = useState(1)
    const [editRobot, setEditRobot] = useState(false)
    const input = useRef(null)
    const [robotToken, setRobotToken] = useState('')
    const [robotWebhook, setRobotWebhook] = useState('')

    const handleChange = (event, newValue) => {
        setValue(newValue)
    }

    const onEditRobot = () => {
        if (editRobot) {
            dialogProps.handleSaveFlow(dialogProps.flowName, { robot: JSON.stringify({ robotAppKey, robotAppSecret }) })
            setEditRobot(false)
            return
        }
        setEditRobot(true)
    }

    const onCopyRobot = () => {
        copyTextToClipboard(`${DOMAIN}${ROBOT_PATH}${dialogProps.chatflowid}`)
    }

    useEffect(() => {
        if (!dialogProps.robot) {
            return
        }
        const robot = JSON.parse(dialogProps?.robot || '{}')
        setRobotAppKey(robot.robotAppKey || '')
        setRobotAppSecret(robot.robotAppSecret || '')
        setRobotToken(robot.robotToken || '')
        setRobotWebhook(robot.robotWebhook || '')
    }, [dialogProps.robot])


    useEffect(() => {
        if (dialogProps.outgoingRobot?.length) {
            setRobotWebhook(dialogProps.outgoingRobot[0].webhook || '')
            setRobotToken(dialogProps.outgoingRobot[0].token || '')
        }
    }, [dialogProps.outgoingRobot])

    const onGenerateToken = () => {
        const token = generateToken();
        // dialogProps.handleSaveFlow(dialogProps.flowName, { robot: JSON.stringify({ robotAppKey, robotAppSecret, robotToken }) })
        setRobotToken(token);
    }

    const onSaveOutgoing = () => {
        handleSaveOutgoing(robotToken, robotWebhook, dialogProps.outgoingRobot?.[0]?.id || '')
    }

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
                        {value === 0 ? (
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
                                {robotType === 1 ? (
                                    <>
                                        <p>
                                            <Bold>STEP1: </Bold>将应用的 AppKey 和 AppSecret 填写到下方表单中
                                        </p>
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
                                        <Button style={{ marginTop: '10px' }} variant='outlined' onClick={onEditRobot}>
                                            {editRobot ? '保存' : '编辑'}
                                        </Button>
                                        <p style={{wordBreak: 'break-all'}}>
                                            <Bold>STEP2: </Bold>复制链接：
                                            <CopyBlock
                                                theme={atomOneDark}
                                                text={`${DOMAIN}${ROBOT_PATH}${dialogProps.chatflowid}`}
                                                language={'bash'}
                                                showLineNumbers={false}
                                                wrapLines
                                            />
                                        </p>
                                        <p>
                                            <Bold>STEP3: </Bold>将连接填写到机器人管理后台「消息接收地址」输入框中
                                        </p>
                                    </>
                                ) : (
                                    // 群内机器人
                                    <>
                                        <p style={{wordBreak: 'break-all'}}>
                                            <Bold>STEP1: </Bold>复制链接，将链接填写到 Outgoing 机制配置中的 「POST 地址」输入框中
                                            <CopyBlock
                                                theme={atomOneDark}
                                                text={`${DOMAIN}${OUTGOING_ROBOT_PATH}${dialogProps.chatflowid}`}
                                                language={'bash'}
                                                showLineNumbers={false}
                                                wrapLines
                                            />
                                        </p>
                                        <p>
                                            <Bold>STEP2: </Bold>点击<Button onClick={onGenerateToken} disabled={robotToken ? true : false}>生成 token</Button>
                                            {robotToken}
                                        </p>
                                        <p>
                                            <Bold>STEP3: </Bold>将生成 Token 填写值 Outgoing 机制配置中的「Token」输入框中
                                        </p>
                                        <p style={{wordBreak: 'break-all'}}>
                                            <Bold>STEP4: </Bold>在钉钉机器人创建窗口中点击完成并复制 Outgoing 机器人 webhook 地址，填入输入框
                                            <OutlinedInput
                                                sx={{ mt: 1 }}
                                                id='chatflow-name'
                                                type='text'
                                                required
                                                fullWidth
                                                placeholder='请填入机器人 Webhook 链接'
                                                value={robotWebhook}
                                                onChange={(e) => setRobotWebhook(e.target.value)}
                                            />
                                        </p>
                                        <p>
                                            <Bold>注意: </Bold>安全设置里IP地址 (段)填写：121.40.244.111
                                        </p>
                                        <p>
                                            <Bold>STEP5: </Bold>点击<Button onClick={onSaveOutgoing}>保存</Button>
                                        </p>
                                    </>
                                )}
                            </>
                        ) : null}
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
