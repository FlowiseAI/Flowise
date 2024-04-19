import { BotMessageTheme, TextInputTheme, UserMessageTheme } from '@/features/bubble/types';
export type FileEvent<T = EventTarget> = {
    target: T;
};
type ImageUploadConstraits = {
    fileTypes: string[];
    maxUploadSize: number;
};
export type UploadsConfig = {
    imgUploadSizeAndTypes: ImageUploadConstraits[];
    isImageUploadAllowed: boolean;
    isSpeechToTextEnabled: boolean;
};
type FilePreviewData = string | ArrayBuffer;
type FilePreview = {
    data: FilePreviewData;
    mime: string;
    name: string;
    preview: string;
    type: string;
};
type messageType = 'apiMessage' | 'userMessage' | 'usermessagewaiting';
export type FileUpload = Omit<FilePreview, 'preview'>;
export type MessageType = {
    messageId?: string;
    message: string;
    type: messageType;
    sourceDocuments?: any;
    fileAnnotations?: any;
    fileUploads?: Partial<FileUpload>[];
};
type observerConfigType = (accessor: string | boolean | object | MessageType[]) => void;
export type observersConfigType = Record<'observeUserInput' | 'observeLoading' | 'observeMessages', observerConfigType>;
export type BotProps = {
    chatflowid: string;
    apiHost?: string;
    chatflowConfig?: Record<string, unknown>;
    welcomeMessage?: string;
    botMessage?: BotMessageTheme;
    userMessage?: UserMessageTheme;
    textInput?: TextInputTheme;
    poweredByTextColor?: string;
    badgeBackgroundColor?: string;
    bubbleBackgroundColor?: string;
    bubbleTextColor?: string;
    showTitle?: boolean;
    title?: string;
    titleAvatarSrc?: string;
    fontSize?: number;
    isFullPage?: boolean;
    observersConfig?: observersConfigType;
};
export declare const Bot: (botProps: BotProps & {
    class?: string;
}) => import("solid-js").JSX.Element;
export {};
//# sourceMappingURL=Bot.d.ts.map