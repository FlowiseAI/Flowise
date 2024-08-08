import AnswersObject from '../../core/models/answersObject';

class JiraObject extends AnswersObject {
  constructor(object) {
    super(object);
  }

  static jiraAdfToMarkdown(node) {
    if (!node) return '';

    if (node.type === 'doc') {
      return node.content.map((item) => `${JiraObject.jiraAdfToMarkdown(item)}`).join('');
    } else if (node.type === 'text') {
      return node.text;
    } else if (node.type === 'hardBreak') {
      // return "\n";
      return ' ';
    } else if (node.type === 'mention') {
      return `@${node.attrs.username}`;
    } else if (node.type === 'emoji') {
      return ''; //`:${node.attrs.shortName}:`;
    } else if (node.type === 'link') {
      return `[${node.text}](${node.attrs.url})`;
    } else if (node.type === 'mediaGroup') {
      return node.content.map(JiraObject.jiraAdfToMarkdown).join('');
    } else if (node.type === 'paragraph') {
      return `${node.content.map(JiraObject.jiraAdfToMarkdown).join('')}. `;
    } else if (node.type === 'bulletList') {
      return node.content.map((item) => `${JiraObject.jiraAdfToMarkdown(item)}`).join('');
    } else if (node.type === 'listItem') {
      return node.content.map((item) => `- ${JiraObject.jiraAdfToMarkdown(item)}`).join('');
    } else if (node.type === 'orderedList') {
      return node.content
        .map((item, index) => `${index + 1}. ${JiraObject.jiraAdfToMarkdown(item)}`)
        .join('');
    } else if (node.type === 'heading') {
      return `\n${'#'.repeat(node.attrs.level)} ${node.content
        .map(JiraObject.jiraAdfToMarkdown)
        .join('')}\n`;
    } else if (node.type === 'codeBlock') {
      return `\`\`\`\n${node.text}\n\`\`\`\n`;
    } else if (node.type === 'blockquote') {
      return `> ${node.content.map(JiraObject.jiraAdfToMarkdown).join('')}\n`;
    } else {
      return '';
    }
  }
}

export default JiraObject;
