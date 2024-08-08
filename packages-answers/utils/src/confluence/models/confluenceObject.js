import AnswersObject from '../../core/models/answersObject';

class ConfluenceObject extends AnswersObject {
  constructor(object) {
    super(object);
  }

  static confluenceHtmlToMarkdown(node) {
    if (!node) return '';

    if (node.nodeType === 'doc') {
      return node.content
        .map((item) => `${ConfluenceObject.confluenceHtmlToMarkdown(item)}`)
        .join('');
    } else if (node.nodeType === 'text') {
      return node.text;
    } else if (node.nodeType === 'hardBreak') {
      return ' ';
    } else if (node.nodeType === 'mention') {
      return `@${node.attrs.username}`;
    } else if (node.nodeType === 'emoji') {
      return ''; //`:${node.attrs.shortName}:`;
    } else if (node.nodeType === 'link') {
      return `[${node.attrs.title}](${node.attrs.href})`;
    } else if (node.nodeType === 'mediaGroup') {
      return node.content.map(ConfluenceObject.confluenceHtmlToMarkdown).join('');
    } else if (node.nodeType === 'paragraph') {
      return `${node.content.map(ConfluenceObject.confluenceHtmlToMarkdown).join('')}. `;
    } else if (node.nodeType === 'bulletList') {
      return node.content
        .map((item) => `${ConfluenceObject.confluenceHtmlToMarkdown(item)}`)
        .join('');
    } else if (node.nodeType === 'orderedList') {
      return node.content
        .map((item, index) => `${index + 1}. ${ConfluenceObject.confluenceHtmlToMarkdown(item)}`)
        .join('');
    } else if (node.nodeType === 'heading') {
      return `\n${'#'.repeat(node.attrs.level)} ${node.content
        .map(ConfluenceObject.confluenceHtmlToMarkdown)
        .join('')}\n`;
    } else if (node.nodeType === 'codeBlock') {
      return `\`\`\`\n${node.content}\n\`\`\`\n`;
    } else if (node.nodeType === 'blockquote') {
      return `> ${node.content.map(ConfluenceObject.confluenceHtmlToMarkdown).join('')}\n`;
    } else {
      return '';
    }
  }
}

export default ConfluenceObject;
