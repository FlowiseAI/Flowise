import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { AgentflowHeader, createHeaderProps } from './AgentflowHeader'

// ─── AgentflowHeader component ────────────────────────────────────────────────

describe('AgentflowHeader', () => {
    const baseProps = {
        flowName: 'My Flow',
        isDirty: false,
        onSave: jest.fn(),
        onExport: jest.fn(),
        onValidate: jest.fn()
    }

    beforeEach(() => jest.clearAllMocks())

    it('renders the flow name', () => {
        render(<AgentflowHeader {...baseProps} />)
        expect(screen.getByText('My Flow')).toBeInTheDocument()
    })

    it('appends dirty marker when isDirty is true', () => {
        render(<AgentflowHeader {...baseProps} isDirty />)
        expect(screen.getByText(/My Flow \*/)).toBeInTheDocument()
    })

    it('omits dirty marker when isDirty is false', () => {
        render(<AgentflowHeader {...baseProps} isDirty={false} />)
        expect(screen.queryByText(/\*/)).not.toBeInTheDocument()
    })

    describe('Save button', () => {
        it('calls onSave when clicked', async () => {
            const onSave = jest.fn()
            const user = userEvent.setup()
            render(<AgentflowHeader {...baseProps} onSave={onSave} />)
            await user.click(screen.getByRole('button', { name: /save/i }))
            expect(onSave).toHaveBeenCalledTimes(1)
        })

        it('is disabled when readOnly is true', () => {
            render(<AgentflowHeader {...baseProps} readOnly />)
            expect(screen.getByRole('button', { name: /save/i })).toBeDisabled()
        })

        it('is enabled when readOnly is false', () => {
            render(<AgentflowHeader {...baseProps} readOnly={false} />)
            expect(screen.getByRole('button', { name: /save/i })).toBeEnabled()
        })
    })
})

// ─── createHeaderProps ────────────────────────────────────────────────────────

describe('createHeaderProps', () => {
    it('passes flowName and isDirty through', () => {
        const props = createHeaderProps(
            'Test Flow',
            true,
            jest.fn(),
            jest.fn(() => '{}'),
            jest.fn()
        )
        expect(props.flowName).toBe('Test Flow')
        expect(props.isDirty).toBe(true)
    })

    it('onValidate delegates to the validate function', () => {
        const validate = jest.fn().mockReturnValue({ valid: true, errors: [] })
        const props = createHeaderProps(
            'Flow',
            false,
            jest.fn(),
            jest.fn(() => '{}'),
            validate
        )
        props.onValidate?.()
        expect(validate).toHaveBeenCalledTimes(1)
    })

    it('onExport calls toJSON and triggers a download link click', () => {
        const toJSON = jest.fn().mockReturnValue('{"nodes":[]}')
        const createObjectURL = jest.fn().mockReturnValue('blob:test')
        const revokeObjectURL = jest.fn()
        const clickSpy = jest.fn()
        URL.createObjectURL = createObjectURL
        URL.revokeObjectURL = revokeObjectURL
        jest.spyOn(document, 'createElement').mockReturnValueOnce({
            href: '',
            download: '',
            click: clickSpy
        } as unknown as HTMLAnchorElement)

        const props = createHeaderProps('Flow', false, jest.fn(), toJSON, jest.fn())
        props.onExport?.()

        expect(toJSON).toHaveBeenCalled()
        expect(createObjectURL).toHaveBeenCalled()
        expect(clickSpy).toHaveBeenCalled()
        expect(revokeObjectURL).toHaveBeenCalledWith('blob:test')
    })
})
