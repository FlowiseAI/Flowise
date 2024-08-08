import AnswersObject from '../../core/models/answersObject';
import { NodeHtmlMarkdown, NodeHtmlMarkdownOptions } from 'node-html-markdown';

class WebObj extends AnswersObject {
  constructor(object) {
    super(object);
  }

  static webToMarkdown(html) {
    const markdown = NodeHtmlMarkdown.translate(
      /* html */ response.data,
      /* options (optional) */ {},
      /* customTranslators (optional) */ undefined,
      /* customCodeBlockTranslators (optional) */ undefined
    );
    return markdown;
  }
}

export default WebObj;
