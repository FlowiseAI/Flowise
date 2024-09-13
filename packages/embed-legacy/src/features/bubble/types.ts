import { MessageType } from '@/components/Bot';

export type BubbleParams = {
  theme?: BubbleTheme;
};

export type BubbleTheme = {
  chatWindow?: ChatWindowTheme;
  button?: ButtonTheme;
};

export type TextInputTheme = {
  backgroundColor?: string;
  textColor?: string;
  placeholder?: string;
  sendButtonColor?: string;
};

export type UserMessageTheme = {
  backgroundColor?: string;
  textColor?: string;
  showAvatar?: boolean;
  avatarSrc?: string;
};

export type BotMessageTheme = {
  backgroundColor?: string;
  textColor?: string;
  showAvatar?: boolean;
  avatarSrc?: string;
};

export type SourceBubbleTheme = {
  hideSources?: boolean;
  label?: string;
  getLabel?: (accessor: string | boolean | object | MessageType[]) => void;
  onSourceClick: (accessor: string | boolean | object | MessageType[]) => void;
};

export interface ChatWindowTheme {
  showTitle?: boolean;
  title?: string;
  titleAvatarSrc?: string;
  welcomeMessage?: string;
  backgroundColor?: string;
  height?: number;
  width?: number;
  fontSize?: number;
  userMessage?: UserMessageTheme;
  botMessage?: BotMessageTheme;
  textInput?: TextInputTheme;
  poweredByTextColor?: string;
  sourceBubble?: SourceBubbleTheme;
}

export type ButtonTheme = {
  size?: 'medium' | 'large';
  backgroundColor?: string;
  iconColor?: string;
  customIconSrc?: string;
  bottom?: number;
  right?: number;
};
