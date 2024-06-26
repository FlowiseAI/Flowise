module.exports = function (migration) {
  const glossaryTerms = migration
    .createContentType("glossaryTerms")
    .name("Glossary Terms")
    .description(
      "Individual terms and their definitions used in the glossaries"
    )
    .displayField("term");
  glossaryTerms
    .createField("term")
    .name("Term")
    .type("Symbol")
    .localized(false)
    .required(false)
    .validations([])
    .disabled(false)
    .omitted(false);
  glossaryTerms
    .createField("definition")
    .name("Definition")
    .type("Text")
    .localized(false)
    .required(false)
    .validations([])
    .disabled(false)
    .omitted(false);

  glossaryTerms
    .createField("glossaryArticle")
    .name("Glossary Article")
    .type("Link")
    .localized(false)
    .required(false)
    .validations([
      {
        linkContentType: ["article"],
      },
    ])
    .disabled(false)
    .omitted(false)
    .linkType("Entry");

  glossaryTerms
    .createField("table")
    .name("Table")
    .type("Link")
    .localized(false)
    .required(false)
    .validations([
      {
        linkContentType: ["table"],
      },
    ])
    .disabled(false)
    .omitted(false)
    .linkType("Entry");

  glossaryTerms.changeFieldControl("term", "builtin", "singleLine", {});
  glossaryTerms.changeFieldControl("definition", "builtin", "markdown", {});
  glossaryTerms.changeFieldControl(
    "glossaryArticle",
    "builtin",
    "entryLinkEditor",
    {}
  );
  glossaryTerms.changeFieldControl("table", "builtin", "entryLinkEditor", {});
};
