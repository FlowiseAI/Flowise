const { runMigration } = require('contentful-migration')

function migrationFunction(migration, context) {
    const glossaryTerms = migration
        .createContentType('glossaryTerms')
        .name('Glossary Terms')
        .description('Individual terms and their definitions used in the glossaries')
        .displayField('term')
    glossaryTerms
        .createField('term')
        .name('Term')
        .type('Symbol')
        .localized(false)
        .required(false)
        .validations([])
        .disabled(false)
        .omitted(false)
    glossaryTerms
        .createField('definition')
        .name('Definition')
        .type('Text')
        .localized(false)
        .required(false)
        .validations([])
        .disabled(false)
        .omitted(false)

    glossaryTerms
        .createField('glossaryArticle')
        .name('Glossary Article')
        .type('Link')
        .localized(false)
        .required(false)
        .validations([
            {
                linkContentType: ['article']
            }
        ])
        .disabled(false)
        .omitted(false)
        .linkType('Entry')

    glossaryTerms
        .createField('table')
        .name('Table')
        .type('Link')
        .localized(false)
        .required(false)
        .validations([
            {
                linkContentType: ['table']
            }
        ])
        .disabled(false)
        .omitted(false)
        .linkType('Entry')

    glossaryTerms.changeFieldControl('term', 'builtin', 'singleLine', {})
    glossaryTerms.changeFieldControl('definition', 'builtin', 'markdown', {})
    glossaryTerms.changeFieldControl('glossaryArticle', 'builtin', 'entryLinkEditor', {})
    glossaryTerms.changeFieldControl('table', 'builtin', 'entryLinkEditor', {})

    const article = migration.editContentType('article')
    article
        .createField('aaiTypeOfArticle')
        .name('Type of Document')
        .type('Array')
        .localized(false)
        .required(false)
        .validations([])
        .disabled(false)
        .omitted(false)
        .items({
            type: 'Symbol',
            validations: []
        })

    article
        .createField('aaiIntent')
        .name('Intent')
        .type('Array')
        .localized(false)
        .required(false)
        .validations([])
        .disabled(false)
        .omitted(false)
        .items({
            type: 'Symbol',
            validations: []
        })

    article
        .createField('aaiComplexity')
        .name('Complexity')
        .type('Symbol')
        .localized(false)
        .required(false)
        .validations([])
        .disabled(false)
        .omitted(false)

    article.changeFieldControl('aaiTypeOfArticle', 'builtin', 'tagEditor', {
        helpText:
            'AnswerAI Evaluated: Categories adapted to help center content to distinguish between different types of articles based on their primary focus'
    })

    article.changeFieldControl('aaiIntent', 'builtin', 'tagEditor', {
        helpText: 'AnswerAI Evaluated: This tag should reflect the primary goal or intended intent of the article.'
    })

    article.changeFieldControl('aaiComplexity', 'builtin', 'singleLine', {
        helpText: 'Used for grading articles based on their level of complexity'
    })
}

; (async () => {
    const options = {
        migrationFunction,
        spaceId: process.env.CONTENTFUL_SPACE_ID,
        environmentId: process.env.CONTENTFUL_ENVIRONMENT_ID,
        accessToken: process.env.CONTENTFUL_MANAGEMENT_TOKEN,
        yes: true
    }
    await runMigration(options)
        .then(() => console.log('Migration Done!'))
        .catch((e) => console.error(e))
})()
