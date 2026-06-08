import type { ReactElement } from 'react'

import { ThemeProvider } from '@mui/material/styles'
import { render } from '@testing-library/react'

import { createObserveTheme } from '@/core/theme'

import { NodeIcon } from './NodeIcon'

function renderWithTheme(ui: ReactElement) {
    return render(<ThemeProvider theme={createObserveTheme(false)}>{ui}</ThemeProvider>)
}

describe('NodeIcon', () => {
    it('renders the agentflow icon with its color when the name is in the static map', () => {
        const { container } = renderWithTheme(<NodeIcon name='startAgentflow' />)
        // Known startAgentflow color from AGENTFLOW_ICONS
        const wrapper = container.firstChild as HTMLElement
        expect(wrapper).toHaveStyle({ backgroundColor: '#7EE787' })
        // The tabler icon renders an inline svg
        expect(wrapper.querySelector('svg')).not.toBeNull()
        // Fallback img should not be rendered
        expect(wrapper.querySelector('img')).toBeNull()
    })

    it('renders distinct colors for different agentflow types', () => {
        const { container: startContainer } = renderWithTheme(<NodeIcon name='startAgentflow' />)
        const { container: agentContainer } = renderWithTheme(<NodeIcon name='agentAgentflow' />)
        expect(startContainer.firstChild as HTMLElement).toHaveStyle({ backgroundColor: '#7EE787' })
        expect(agentContainer.firstChild as HTMLElement).toHaveStyle({ backgroundColor: '#4DD0E1' })
    })

    it('falls back to the API node-icon endpoint for unknown names', () => {
        const { container } = renderWithTheme(<NodeIcon name='customUnknownNode' apiBaseUrl='http://localhost:3000' />)
        const img = container.querySelector('img')
        expect(img).not.toBeNull()
        expect(img?.getAttribute('src')).toBe('http://localhost:3000/api/v1/node-icon/customUnknownNode')
    })

    it('respects the size prop on the wrapper', () => {
        const { container } = renderWithTheme(<NodeIcon name='startAgentflow' size={48} />)
        const wrapper = container.firstChild as HTMLElement
        expect(wrapper).toHaveStyle({ width: '48px', height: '48px' })
    })
})
