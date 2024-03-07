import { IMultiModalOption } from './Interface'

export interface IVisionChatModal {
    id: string
    configuredModel: string
    configuredMaxToken: number
    multiModalOption: IMultiModalOption

    setVisionModel(): void
    revertToOriginalModel(): void
    setMultiModalOption(multiModalOption: IMultiModalOption): void
}
