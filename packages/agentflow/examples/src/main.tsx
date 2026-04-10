import React from 'react'
import ReactDOM from 'react-dom/client'

import CssBaseline from '@mui/material/CssBaseline'
import { createTheme, ThemeProvider } from '@mui/material/styles'

import App from './App'

// Import the agentflow CSS (from source for development)
import '../../src/features/canvas/canvas.css'

const theme = createTheme({
    palette: {
        mode: 'light'
    }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <App />
        </ThemeProvider>
    </React.StrictMode>
)
