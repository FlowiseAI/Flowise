import JiraObject from './jiraObject';
class JiraThread extends JiraObject {
  constructor(thread) {
    const tidiedThread = JiraThread.tidy(thread);

    super(tidiedThread);
    // this.thread = thread;
    // this.object.objectType = 'JIRA Comments Thread';
    this.object.uid = thread.issueKey;
  }

  static tidy(thread) {
    return {
      id: thread?.id?.toLowerCase(),
      issueKey: thread?.issueKey?.toLowerCase(),
      project: thread.issueKey?.split('-')[0]?.toLowerCase(),
      // objectType: 'JIRA comments thread',
      text: thread?.text || createContext(thread, this.jiraAdfToMarkdown)
    };
  }

  getVectors() {
    //chunk comments into 10 pero thread and add to vectors
    const vectors = [];
    const { comments } = this.object;
    const chunkSize = 10;
    chunkArray(comments, chunkSize).forEach((chunk, idx) => {
      const vector = {
        id: thread?.id,
        // issueKey: `${this.object.uid}${idx}`,
        // objectType: 'JIRA comments thread',
        text: thread?.text || createContext({ ...thread, comments: chunk }, this.jiraAdfToMarkdown)
      };
      vectors.push(vector);
    });
    return vectors;
  }
}

// TODO : Use feature flag to determine context parser
const createContext = (metadata, jiraAdfToMarkdown) => {
  // let string = 'The context for ' + id + ' ';
  let string = '';
  const thread = metadata?.comments
    ?.map(
      ({ author, body, updated, self }) =>
        // `[${updated} - ${author?.displayName}](${self}): ${jiraAdfToMarkdown(body)}`
        `${author?.displayName} commented "${jiraAdfToMarkdown(body)}" on ${metadata?.issueKey}.`
    )
    ?.join('. ');
  if (!thread) return '';
  string += `${thread}`;
  return string;
};
export default JiraThread;
