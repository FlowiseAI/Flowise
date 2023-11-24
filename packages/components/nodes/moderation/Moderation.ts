import { Server } from 'socket.io'

export abstract class Moderation {
    abstract checkForViolations(input: string): Promise<string>
}

export const checkInputs = async (inputModerations: Moderation[], input: string): Promise<string> => {
    for (const moderation of inputModerations) {
        input = await moderation.checkForViolations(input)
    }
    return input
}

// is this the correct location for this function?
// should we have a utils files that all node components can use?
export const streamResponse = (isStreaming: any, response: string, socketIO: Server, socketIOClientId: string) => {
    if (isStreaming) {
        const result = response.split(/(\s+)/)
        result.forEach((token: string, index: number) => {
            if (index === 0) {
                socketIO.to(socketIOClientId).emit('start', token)
            }
            socketIO.to(socketIOClientId).emit('token', token)
        })
        socketIO.to(socketIOClientId).emit('end')
    }
}
