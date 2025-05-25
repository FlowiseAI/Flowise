/*
* TODO: Disabling for now as we need to enable login first
*
describe('E2E suite for api/v1/apikey API endpoint', () => {
    beforeEach(() => {
        cy.visit('http://localhost:3000/apikey')
    })

    // DEFAULT TEST ON PAGE LOAD
    it('displays 1 api key by default', () => {
        cy.get('table.MuiTable-root tbody tr').should('have.length', 1)
        cy.get('table.MuiTable-root tbody tr td').first().should('have.text', 'DefaultKey')
    })

    // CREATE
    it('can add new api key', () => {
        const newApiKeyItem = 'MafiKey'
        cy.get('#btn_createApiKey').click()
        cy.get('#keyName').type(`${newApiKeyItem}`)
        cy.get('#btn_confirmAddingApiKey').click()
        cy.get('table.MuiTable-root tbody tr').should('have.length', 2)
        cy.get('table.MuiTable-root tbody tr').last().find('td').first().should('have.text', newApiKeyItem)
    })

    // READ
    it('can retrieve all api keys', () => {
        cy.get('table.MuiTable-root tbody tr').should('have.length', 2)
        cy.get('table.MuiTable-root tbody tr').first().find('td').first().should('have.text', 'DefaultKey')
        cy.get('table.MuiTable-root tbody tr').last().find('td').first().should('have.text', 'MafiKey')
    })

    // UPDATE
    it('can update new api key', () => {
        const UpdatedApiKeyItem = 'UpsertCloudKey'
        cy.get('table.MuiTable-root tbody tr').last().find('td').eq(4).find('button').click()
        cy.get('#keyName').clear().type(`${UpdatedApiKeyItem}`)
        cy.get('#btn_confirmEditingApiKey').click()
        cy.get('table.MuiTable-root tbody tr').should('have.length', 2)
        cy.get('table.MuiTable-root tbody tr').last().find('td').first().should('have.text', UpdatedApiKeyItem)
    })

    // DELETE
    it('can delete new api key', () => {
        cy.get('table.MuiTable-root tbody tr').last().find('td').eq(5).find('button').click()
        cy.get('.MuiDialog-scrollPaper .MuiDialogActions-spacing button').last().click()
        cy.get('table.MuiTable-root tbody tr').should('have.length', 1)
    })
})
*/
