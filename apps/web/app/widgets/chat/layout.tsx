import React, { ReactNode } from 'react'
import { AnswersProvider } from '@ui/AnswersContext'

const WidgetChatLayout = async ({
    // Layouts must accept a children prop.
    params,
    // This will be populated with nested layouts or pages
    children
}: {
    children: ReactNode
    params: {
        slug: string
    }
}) => {
    return <AnswersProvider appSettings={{}}>{children}</AnswersProvider>
}

export default WidgetChatLayout
