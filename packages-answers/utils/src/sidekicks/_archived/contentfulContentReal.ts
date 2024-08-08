import { Sidekick } from 'types'

const sidekick: Sidekick = {
    departments: ['marketing'],
    label: 'Contentful Entry Real',
    value: 'contentfulContentReal',
    placeholder: 'I can help you publish content in Contentful',
    getSystemPromptTemplate: () => {
        return `You are a Contentful Entry Expert. You assist people in publishing content in Contentful`
    },
    getUserPromptTemplate: (query, context) => {
        return `Convert this blog post content in this chain. I want you to make the following changes to the blog post:
    ${query}
    """
    Use this JSON template to create the content entry for this blog post:
    """
    {
      "metadata": {
          "tags": []
      },
      "sys": {
          "space": {
              "sys": {
                  "type": "Link",
                  "linkType": "Space",
                  "id": "imglmb3xms7o"
              }
          },
          "id": "5EpajGfjb4CqYxHyGtiHaC",
          "type": "Entry",
          "createdAt": "2023-06-18T05:38:13.526Z",
          "updatedAt": "2023-06-18T05:38:13.526Z",
          "environment": {
              "sys": {
                  "id": "master",
                  "type": "Link",
                  "linkType": "Environment"
              }
          },
          "revision": 1,
          "contentType": {
              "sys": {
                  "type": "Link",
                  "linkType": "ContentType",
                  "id": "pageBlog"
              }
          }
      },
      "fields": {
          "title": {
              "en-US": "This is and engaging title"
          },
          "landingPageSummary": {
              "en-US": "This is the summary that is shown on the blog cards or when it is in a featured area like the blog landing page"
          },
          "creationDate": {
              "en-US": "01/01/2020"
          },
          "slug": {
              "en-US": "this-is-and-engaging-title"
          },
          "author": {
              "en-US": "John Smith"
          },
          "featuredMedia": {
              "en-US": [
                  {
                      "sys": {
                          "type": "Link",
                          "linkType": "Entry",
                          "id": "1lsWAQn8pEIt9nEhXVsTAS"
                      }
                  }
              ]
          },
          "body": {
              "en-US": {
                  "data": {},
                  "content": [
                      {
                          "data": {},
                          "content": [
                              {
                                  "data": {},
                                  "marks": [],
                                  "value": "Heading 2",
                                  "nodeType": "text"
                              }
                          ],
                          "nodeType": "heading-2"
                      },
                      {
                          "data": {},
                          "content": [
                              {
                                  "data": {},
                                  "marks": [],
                                  "value": "Nulla vitae elit libero, a pharetra augue. Sed posuere consectetur est at lobortis.",
                                  "nodeType": "text"
                              }
                          ],
                          "nodeType": "paragraph"
                      },
                      {
                          "data": {},
                          "content": [
                              {
                                  "data": {},
                                  "marks": [],
                                  "value": "Heading 3",
                                  "nodeType": "text"
                              }
                          ],
                          "nodeType": "heading-3"
                      },
                      {
                          "data": {},
                          "content": [
                              {
                                  "data": {},
                                  "marks": [],
                                  "value": "Nulla vitae elit libero, a pharetra augue. Sed posuere consectetur est at lobortis.Nulla vitae elit libero, a pharetra augue. Sed posuere consectetur est at lobortis.Nulla vitae elit libero, a pharetra augue. Sed posuere consectetur est at lobortis.Nulla vitae elit libero, a pharetra augue. Sed posuere consectetur est at lobortis",
                                  "nodeType": "text"
                              }
                          ],
                          "nodeType": "paragraph"
                      },
                      {
                          "data": {},
                          "content": [
                              {
                                  "data": {},
                                  "marks": [],
                                  "value": "Heading 2",
                                  "nodeType": "text"
                              }
                          ],
                          "nodeType": "heading-2"
                      },
                      {
                          "data": {},
                          "content": [
                              {
                                  "data": {},
                                  "marks": [],
                                  "value": "Nulla vitae elit libero, a pharetra augue. Sed posuere consectetur est at lobortis.",
                                  "nodeType": "text"
                              }
                          ],
                          "nodeType": "paragraph"
                      }
                  ],
                  "nodeType": "document"
              }
          },
          "seo": {
              "en-US": {
                  "title": {
                      "name": "title",
                      "value": "SEO Page Title"
                  },
                  "description": {
                      "name": "description",
                      "value": "SEO description under 158 characters"
                  },
                  "keywords": {
                      "name": "keywords",
                      "value": "keywords seperated, by, commas"
                  },
                  "canonical": {
                      "name": "canonical",
                      "value": ""
                  }
              }
          }
      }
  }
  Always end with the following iframe: <iframe src="https://answerai-marketing-git-last-rev-starter-lastrev.vercel.app/live-preview?id=3tJBL4yg6WdoPWUHxHZim2" />
  write the new JSON in markdown using the previous blog here:\n\n
  """
    `
    },
    contextStringRender: (context) => {
        return `filePath: ${context.metadata.filePath}\n${context.metadata.text}\n\n`
    }
}

export default sidekick
