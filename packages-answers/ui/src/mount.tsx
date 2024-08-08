import { ThemeProvider } from '@emotion/react'
import flagsmith from 'flagsmith'
import { FlagsmithProvider } from 'flagsmith/react'
import { darkModeTheme } from './theme'
import { mount as ogMount } from 'cypress/react18'
import MockNextRouter from './MockNextRouter'

export const mount = (children: any) =>
    ogMount(
        <MockNextRouter>
            <FlagsmithProvider
                flagsmith={flagsmith}
                options={{
                    environmentID: process.env.FLAGSMITH_ENVIRONMENT_ID!
                }}
            >
                <ThemeProvider theme={darkModeTheme}>{children}</ThemeProvider>
            </FlagsmithProvider>
        </MockNextRouter>
    )
