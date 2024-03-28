describe('E2E suite for api/v1/variables API endpoint', () => {
    beforeEach(() => {
        cy.visit('http://localhost:3000/variables')
    })

    // DEFAULT TEST ON PAGE LOAD
    it('displays no variables by default', () => {
        cy.get('.MuiCardContent-root .MuiStack-root').last().find('div').last().should('have.text', 'No Variables Yet')
    })

    // CREATE
    it('can add new variable', () => {
        const newVariableName = 'MafiVariable'
        const newVariableValue = 'shh!!! secret value'
        cy.get('#btn_createVariable').click()
        cy.get('#txtInput_variableName').type(`${newVariableName}`)
        cy.get('#txtInput_variableValue').type(`${newVariableValue}`)
        cy.get('.MuiDialogActions-spacing button').click()
        cy.get('.MuiTable-root tbody tr').should('have.length', 1)
        cy.get('.MuiTable-root tbody tr').last().find('th').first().find('div').first().should('have.text', newVariableName)
    })

    // READ
    it('can retrieve all api keys', () => {
        const newVariableName = 'MafiVariable'
        cy.get('.MuiTable-root tbody tr').should('have.length', 1)
        cy.get('.MuiTable-root tbody tr').last().find('th').first().find('div').first().should('have.text', newVariableName)
    })

    // UPDATE
    it('can update new api key', () => {
        const updatedVariableName = 'PichiVariable'
        const updatedVariableValue = 'silence shh! value'
        cy.get('.MuiTable-root tbody tr').last().find('td').eq(4).find('button').click()
        cy.get('#txtInput_variableName').clear().type(`${updatedVariableName}`)
        cy.get('#txtInput_variableValue').clear().type(`${updatedVariableValue}`)
        cy.get('.MuiDialogActions-spacing button').click()
        cy.get('.MuiTable-root tbody tr').should('have.length', 1)
        cy.get('.MuiTable-root tbody tr').last().find('th').first().find('div').first().should('have.text', updatedVariableName)
    })

    // DELETE
    it('can delete new api key', () => {
        cy.get('.MuiTable-root tbody tr').last().find('td').eq(5).find('button').click()
        cy.get('.MuiDialog-scrollPaper .MuiDialogActions-spacing button').last().click()
        cy.get('.MuiTable-root tbody tr').should('have.length', 0)
        cy.get('.MuiCardContent-root .MuiStack-root').last().find('div').last().should('have.text', 'No Variables Yet')
    })
})
