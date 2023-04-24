export type BubbleParams = {
    theme?: BubbleTheme
}

export type BubbleTheme = {
    chatWindow?: ChatWindowTheme
    button?: ButtonTheme
}

export type ChatWindowTheme = {
    backgroundColor?: string
}

export type ButtonTheme = {
    size?: 'medium' | 'large'
    backgroundColor?: string
    iconColor?: string
    customIconSrc?: string
}
