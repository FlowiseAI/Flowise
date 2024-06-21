import { Checkpoint, CheckpointMetadata } from '@langchain/langgraph'
import { RunnableConfig } from '@langchain/core/runnables'
import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages'

export type SaverOptions = {
    datasourceOptions: any
    threadId: string
}

export interface CheckpointTuple {
    config: RunnableConfig
    checkpoint: Checkpoint
    metadata?: CheckpointMetadata
    parentConfig?: RunnableConfig
}

export interface SerializerProtocol<D> {
    stringify(obj: D): string
    parse(data: string): Promise<D>
}

export const convertCheckpointMessagesToBaseMessage = (checkpointTuple: CheckpointTuple): BaseMessage[] => {
    const baseMessages: BaseMessage[] = []
    const { checkpoint } = checkpointTuple
    if (checkpoint && checkpoint.channel_values && checkpoint.channel_values.messages) {
        const messages = (checkpoint.channel_values.messages as any[]) ?? []
        messages.forEach((message: any) => {
            if (message.id.includes('AIMessage')) {
                baseMessages.push(
                    new AIMessage({
                        content: message.kwargs?.content,
                        name: message.kwargs?.name,
                        additional_kwargs: message.kwargs?.additional_kwargs
                    })
                )
            } else if (message.id.includes('HumanMessage')) {
                baseMessages.push(
                    new HumanMessage({
                        content: message.kwargs?.content,
                        name: message.kwargs?.name,
                        additional_kwargs: message.kwargs?.additional_kwargs
                    })
                )
            }
        })
    }
    return baseMessages
}
