import { mount } from '../mount'
import { MessageCard } from './_Message'
import { Message } from 'types'

describe('Message', () => {
    const defaultProps: Message = {
        id: 'test-id',
        content: 'Test content',
        role: 'user',
        user: {
            name: 'John Doe',
            // accounts: [],
            appSettings: {},
            email: 'user@theanswer.ai',
            id: 'test-id',
            role: 'user',
            createdAt: new Date(''),
            updatedAt: new Date(''),
            emailVerified: new Date(),
            organizationId: 'test-org-id',
            invited: new Date(),
            image: null
        },
        likes: 0,
        dislikes: 0
    }

    it('renders correctly', () => {
        mount(<MessageCard {...defaultProps} />)
        cy.get('[data-cy=message]').should('exist')
        cy.contains(defaultProps.content)
    })

    // it('handles likes', () => {
    //   mount(<MessageCard {...defaultProps} />);
    //   cy.get('[data-cy=like-button]').click();
    // });

    // it('handles dislikes', () => {
    //   mount(<MessageCard {...defaultProps} />);
    //   cy.get('[data-cy=dislike-button]').click();
    //   cy.get('[data-cy=dislike-button]').should('have.css', 'color', 'rgb(255, 0, 0)');
    // });

    // it('renders developer_mode when enabled', () => {
    //   mount(<MessageCard {...defaultProps} developer_mode={{ enabled: true }} />);
    //   cy.get('[data-cy=accordion]').should('exist');
    // });

    // it('does not render developer_mode when disabled', () => {
    //   mount(<MessageCard {...defaultProps} developer_mode={{ enabled: false }} />);
    //   cy.get('[data-cy=accordion]').should('not.exist');
    // });
})
