import { sendRequest } from '@/utils/index'

export type MessageRequest = {
    chatflowid: string
    apiHost?: string
    body: any
}

export const sendMessageQuery = ({ chatflowid, apiHost = 'http://localhost:3000', body }: MessageRequest) =>
    sendRequest<any>({
        method: 'POST',
        url: `${apiHost}/api/v1/prediction/${chatflowid}`,
        body
    })
