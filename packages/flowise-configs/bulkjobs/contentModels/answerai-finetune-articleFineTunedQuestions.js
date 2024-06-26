module.exports = function (migration) {
  const articleFineTunedQuestions = migration
    .createContentType('articleFineTunedQuestions')
    .name('Article Fine Tuned Questions')
    .description('A list of labeled and tagged questions and answer pairs based on the content of the Article items')
    .displayField('question')

  articleFineTunedQuestions
    .createField('question')
    .name('Question')
    .type('Text')
    .localized(false)
    .required(false)
    .validations([])
    .disabled(false)
    .omitted(false)
  articleFineTunedQuestions
    .createField('answer')
    .name('Answer')
    .type('Text')
    .localized(false)
    .required(false)
    .validations([])
    .disabled(false)
    .omitted(false)

  articleFineTunedQuestions
    .createField('originalArticle')
    .name('Original Article')
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

  articleFineTunedQuestions
    .createField('persona')
    .name('Persona')
    .type('Symbol')
    .localized(false)
    .required(false)
    .validations([])
    .disabled(false)
    .omitted(false)

  articleFineTunedQuestions
    .createField('questionType')
    .name('Question Type')
    .type('Symbol')
    .localized(false)
    .required(false)
    .validations([
      {
        in: [
          'Fact-based Questions',
          'Procedural Questions',
          'Exploratory Questions',
          'Comparative Question',
          'Scenario-based Questions',
          'Problem-solving Questions',
          'Yes/No Questions',
          'Multiple Choice Questions'
        ]
      }
    ])
    .disabled(false)
    .omitted(false)

  articleFineTunedQuestions
    .createField('complexity')
    .name('Complexity')
    .type('Symbol')
    .localized(false)
    .required(false)
    .validations([])
    .disabled(false)
    .omitted(false)
  articleFineTunedQuestions.changeFieldControl('question', 'builtin', 'markdown', {})
  articleFineTunedQuestions.changeFieldControl('answer', 'builtin', 'markdown', {})
  articleFineTunedQuestions.changeFieldControl('originalArticle', 'builtin', 'entryLinkEditor', {})
  articleFineTunedQuestions.changeFieldControl('persona', 'builtin', 'singleLine', {})
  articleFineTunedQuestions.changeFieldControl('questionType', 'builtin', 'singleLine', {})
  articleFineTunedQuestions.changeFieldControl('complexity', 'builtin', 'singleLine', {})
}
