import { render, screen } from '@testing-library/react'

import { TooltipWithParser } from './TooltipWithParser'

jest.mock('html-react-parser', () => {
    const mockParser = (html: string) => html
    mockParser.displayName = 'mockParser'
    return { __esModule: true, default: mockParser }
})

describe('TooltipWithParser', () => {
    it('renders info icon button', () => {
        render(<TooltipWithParser title='Some tooltip' />)

        expect(screen.getByRole('button')).toBeInTheDocument()
        expect(screen.getByTestId('InfoIcon')).toBeInTheDocument()
    })

    it('renders tooltip with parsed HTML content', async () => {
        render(<TooltipWithParser title='<b>Bold</b> text' />)

        // Hover over the button to trigger the tooltip
        const button = screen.getByRole('button')
        button.focus()

        expect(await screen.findByRole('tooltip')).toHaveTextContent('<b>Bold</b> text')
    })

    it('applies custom sx props', () => {
        render(<TooltipWithParser title='Tooltip' sx={{ color: 'red' }} />)

        expect(screen.getByTestId('InfoIcon')).toBeInTheDocument()
    })
})
