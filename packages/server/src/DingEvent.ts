import WebSocket from 'ws'
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { getDataSource } from './DataSource'
import { ChatFlow } from './entity/ChatFlow'

export type IMessage = IFileMsg | ITextMsg

type IFileMsg = ICommonMsg & {
    content: Content
    msgtype: 'file'
}
interface ICommonMsg {
    conversationId: string
    chatbotCorpId: string
    chatbotUserId: string
    msgId: string
    senderNick: string
    isAdmin: boolean
    senderStaffId: string
    sessionWebhookExpiredTime: number
    createAt: number
    senderCorpId: string
    conversationType: string
    senderId: string
    sessionWebhook: string
    robotCode: string
}
type ITextMsg = ICommonMsg & {
    text: Text
    msgtype: 'text'
}

interface Text {
    content: string
}
interface Content {
    spaceId: string
    fileName: string
    downloadCode: string
    fileId: string
}
let token = ''
// 使用axios获取钉钉接口accessToken
export const getAccessToken = async (appKey: string, appSecret: string) => {
    if (token) {
        return token
    }
    const {
        data: { accessToken, expireIn }
    } = await axios.post(
        'https://api.dingtalk.com/v1.0/oauth2/accessToken',
        {
            appKey,
            appSecret
        },
        {
            headers: {
                'Content-Type': 'application/json'
            }
        }
    )
    token = accessToken
    setTimeout(() => {
        token = ''
    }, expireIn * 1000)
    return accessToken
}

// 使用axios让钉钉机器人给某个人发送消息
export const sendMsg = async (msg: string, uid: string, id: string) => {
    const dataSource = getDataSource();
    const chatflow = await dataSource.getRepository(ChatFlow).findOneBy({
        id
    })
    if (!chatflow?.robot) {
        return -1;
    }
    const robot = JSON.parse(chatflow.robot);
    const accessToken = await getAccessToken(robot.robotAppKey, robot.robotAppSecret);
    const res = await axios.post(
        `https://api.dingtalk.com/v1.0/robot/oToMessages/batchSend`,
        {
            robotCode: robot.robotAppKey,
            userIds: [uid],
            msgKey: 'sampleMarkdown',
            msgParam: JSON.stringify({
                title: '合同法务数字专员',
                text: msg
            })
        },
        {
            headers: {
                'Content-Type': 'application/json',
                'x-acs-dingtalk-access-token': accessToken
            }
        }
    )
    return res
}

// 使用axios下载钉钉机器人发送的文件
export const getDownloadFileUrl = async (downloadCode: string, id: string) => {
    const dataSource = getDataSource();
    const chatflow = await dataSource.getRepository(ChatFlow).findOneBy({
        id
    })
    if (!chatflow?.robot) {
        return -1;
    }
    const robot = JSON.parse(chatflow.robot);
    const accessToken = await getAccessToken(robot.robotAppKey, robot.robotAppSecret);
    const res = await axios.post(
        `https://api.dingtalk.com/v1.0/robot/messageFiles/download`,
        {
            robotCode: process.env.ROBOT_CODE,
            downloadCode: downloadCode
        },
        {
            headers: {
                'Content-Type': 'application/json',
                'x-acs-dingtalk-access-token': accessToken
            }
        }
    )
    return res.data?.downloadUrl
}

export const downloadPdf = async (pdfUrl: string, fileName: string) => {
    const res = await axios({
        url: pdfUrl,
        method: 'GET',
    }).then((response) => {
        const filepath = `${path.join(__dirname, '..', 'uploads')}/${fileName}` // 绝对路径
        // 创建可写流
        const writer = fs.createWriteStream(filepath)
        // 将响应数据流写入可写流
        response.data.pipe(writer)

        return new Promise((resolve, reject) => {
            // 当可写流关闭时，返回本地文件路径
            writer.on('finish', () => {
                resolve(filepath)
            })
            // 在发生错误时，返回错误信息
            writer.on('error', reject)
        })
    })
    return res
}
export async function chatQuery(data: any, id: string) {
    const response = await axios.post(`http://127.0.0.1:3000/api/v1/prediction/${id}`, data)
    return response.data
}

// export const registerDingEvent = async () => {
//     // 使用axios获取接口
//     const ws = new WebSocket(`wss://bp0r55.laf.dev/__websocket__?userId=7szxftktf28`)
//
//     ws.on('error', console.error)
//
//     ws.on('open', function open() {
//         // ws.send('something');
//         console.log('open')
//         ws.send(Date.now())
//     })
//     ws.on('close', function close() {
//         console.log('disconnected')
//         registerDingEvent()
//     })
//     ws.on('ping', () => {
//         console.log('ping')
//     })
//     ws.on('message', async (data) => {
//         console.log('received: %s', data)
//         try {
//             const msg: IMessage = JSON.parse(data.toString())
//             if (msg.msgtype === 'text') {
//                 const userMsg = msg.text.content
//                 const res = await chatQuery({ question: userMsg, userId: msg.senderStaffId })
//
//                 await sendMsg(res?.text || res, msg.senderStaffId)
//             } else if (msg.msgtype === 'file') {
//                 const { downloadCode } = msg.content
//                 const pdfUrl = await getDownloadFileUrl(downloadCode)
//                 const fileName = msg.content.fileId + msg.content.fileName
//                 const filePath = await downloadPdf(pdfUrl, fileName)
//                 const res = await chatQuery({
//                     question: `用户上传了一份文件, 文件路径是： ${filePath}。帮我总结一下，使用中文`,
//                     userId: msg.senderStaffId
//                 })
//                 await sendMsg(res?.text || res, msg.senderStaffId)
//             }
//         } catch (error) {
//             // console.log(error)
//         }
//     })
//     return ws
// }

// {
//   conversationId: 'cidpq7YV0yuAqZf/dL1EFumF7bt+eqTN/spzpboSqx7NwM=',
//   chatbotCorpId: 'ding9f50b15bccd16741',
//   chatbotUserId: '$:LWCP_v1:$0+vzxI3LT9ynhx+78ATdxwjgwIJeCyQ3',
//   msgId: 'msgbiJkBooMjmi4vMnnUV4Nkg==',
//   senderNick: '无弃',
//   isAdmin: true,
//   senderStaffId: '0245420330692695',
//   sessionWebhookExpiredTime: 1684147132760,
//   createAt: 1684141732575,
//   content: {
//     spaceId: '21581940455',
//     fileName: '合同.pdf',
//     downloadCode: 'F3PaT2jEcDh9n79aFyKgdBITl3H4OAMm+wkgMhWDHhMryVquUddYe3KtyHZYfYCyRESS3osx1XUDsbVkJqwZF+uxGi6T/ZWfkOK5FMw98ArFIX1re3v0jnO5slmwKY+cLRrvnZlCsOfJhslw4OnEMtUdNQS3y61CuuU1sSVd4XH8p9SAbrnzdznjk7uQ0qmuxRC5bc/MIL+AhsYQQmJq/w==',
//     fileId: '104573050332'
//   },
//   senderCorpId: 'ding9f50b15bccd16741',
//   conversationType: '1',
//   senderId: '$:LWCP_v1:$NKyy1Pf206f3ENVW1wGkCg==',
//   sessionWebhook: 'https://oapi.dingtalk.com/robot/sendBySession?session=4f1d0b116922947dde98dcfc7645f95d',
//   robotCode: process.env.ROBOT_CODE,
//   msgtype: 'file'
// }

// {
//   conversationId: 'cidpq7YV0yuAqZf/dL1EFumF7bt+eqTN/spzpboSqx7NwM=',
//   chatbotCorpId: 'ding9f50b15bccd16741',
//   chatbotUserId: '$:LWCP_v1:$0+vzxI3LT9ynhx+78ATdxwjgwIJeCyQ3',
//   msgId: 'msgWskR+Kk3rIHO5bXqKM6Vcg==',
//   senderNick: '无弃',
//   isAdmin: true,
//   senderStaffId: '0245420330692695',
//   sessionWebhookExpiredTime: 1684147081149,
//   createAt: 1684141681001,
//   senderCorpId: 'ding9f50b15bccd16741',
//   conversationType: '1',
//   senderId: '$:LWCP_v1:$NKyy1Pf206f3ENVW1wGkCg==',
//   sessionWebhook: 'https://oapi.dingtalk.com/robot/sendBySession?session=4f1d0b116922947dde98dcfc7645f95d',
//   text: { content: '213' },
//   robotCode: process.env.ROBOT_CODE,
//   msgtype: 'text'
// }
