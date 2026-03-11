declare module '*.svg' {
    const content: string
    export default content
}

declare module '*.css' {
    const content: Record<string, string>
    export default content
}

declare module 'react-syntax-highlighter/dist/esm/styles/prism' {
    export const oneDark: Record<string, unknown>
}

declare module 'flowise-react-json-view' {
    import { ComponentType } from 'react'
    interface ReactJsonProps {
        theme?: string
        style?: Record<string, unknown>
        src: object
        name?: string | null
        quotesOnKeys?: boolean
        enableClipboard?: boolean | ((e: unknown) => void)
        displayDataTypes?: boolean
        collapsed?: number | boolean
    }
    const ReactJson: ComponentType<ReactJsonProps>
    export default ReactJson
}

declare module 'rehype-mathjax' {
    const rehypeMathjax: unknown
    export default rehypeMathjax
}

declare module 'remark-math' {
    const remarkMath: unknown
    export default remarkMath
}

declare module 'remark-gfm' {
    const remarkGfm: unknown
    export default remarkGfm
}

declare module 'react-datepicker' {
    import { ComponentType } from 'react'
    interface DatePickerProps {
        selected?: Date | null
        onChange?: (date: Date) => void
        selectsStart?: boolean
        selectsEnd?: boolean
        startDate?: Date | null
        endDate?: Date | null
        className?: string
        wrapperClassName?: string
        maxDate?: Date
        minDate?: Date | null
        customInput?: React.ReactNode
    }
    const DatePicker: ComponentType<DatePickerProps>
    export default DatePicker
}
