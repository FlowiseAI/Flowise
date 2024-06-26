module.exports = function (migration) {
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
