import JiraObject from './jiraObject';
class JiraComment extends JiraObject {
  constructor(comment) {
    const tidiedComment = JiraComment.tidy(comment);
    super(tidiedComment);
    this.object.objectType = 'JIRA Comment';
    this.object.uid = comment.id;
  }

  static tidy(comment) {
    // console.log('FIELDS', comment);
    // delete comment.updateAuthor;
    // delete comment.jsdPublic;
    // delete comment.visibility;
    const attrs = {
      ...comment,
      // key,
      objectType: 'JIRA Comment',
      author: comment?.author?.displayName,
      link: comment?.self,
      body: this.jiraAdfToMarkdown(comment?.body)
    };
    return {
      ...attrs,
      text: createContext(attrs)
    };
  }
}
const createContext = (metadata) => {
  // let string = 'The context for ' + id + ' ';
  let string = '';
  string += `${metadata.author} commented "${metadata.body}" on ${metadata.created} and last updated on ${metadata.updated}.`;
  return string;
};
export default JiraComment;
