import JiraObject from './jiraObject';

class JiraIssue extends JiraObject {
  constructor(issue) {
    const tidiedIssue = JiraIssue.tidy(issue);
    // console.log('Tidy');
    // console.log(tidiedIssue);
    super(tidiedIssue);
    this.object.objectType = 'JIRA Issue';
    this.object.uid = issue.key;
    // this.vectors = this.getVectors();
  }

  static tidy(issue) {
    const { fields, key } = issue;
    // console.log(fields);
    const attrs = {
      objectType: 'JIRA Issue',
      // issueTypeId: fields?.issuetype?.id,
      // issueType: fields?.issuetype?.name,
      // 'issue id': key,
      account: fields.customfield_10037?.value?.toLowerCase(),
      project: fields.project?.name?.toLowerCase(),
      reporter: fields.reporter?.displayName?.toLowerCase(),
      assignee: fields.assignee?.displayName || 'Unassigned'?.toLowerCase(),
      assignee_email: fields.assignee?.email?.toLowerCase(),
      priority: fields.priority?.name?.toLowerCase(),
      comments: fields?.comments?.toLowerCase(),
      // priorityId: fields.priority?.id,
      // creatorId: fields.creator?.accountId,
      // creator: fields.creator?.displayName,
      // statusId: parseInt(fields.status?.id, 10),
      status: fields.status?.name?.toLowerCase(),
      status_category: fields.status?.statusCategory?.name?.toLowerCase(),
      parent_key: fields.parent?.key?.toLowerCase(),
      description: (fields.description
        ? JiraIssue.jiraAdfToMarkdown(fields.description)
        : ''
      )?.toLowerCase(),
      summary: fields?.summary?.toLowerCase()
      // statusCategoryId: fields.status?.statusCategory?.id,
      // reporterId: fields.reporter?.accountId,
      // assigneeId: fields.assignee?.accountId,
      // parentIssue: {
      // parentIssueSummary: fields.parent?.fields?.summary,
      // parentIssueTypeId: fields.parent?.issuetype?.id,
      // issueType: fields.parent?.issuetype?.name
      // },
      // projectId: fields.project?.key,
      // objectType: 'JIRA Project'
    };

    return {
      ...attrs,
      text: createContext(key, attrs)
    };
  }
}

const createContext = (id, metadata) => {
  let string = '' + id + ' ';
  string += Object.keys(metadata)
    .filter((key) => !!metadata[key])
    .map((key) => {
      if (metadata.hasOwnProperty(key)) {
        return `${key?.replaceAll('_', ' ')} is ${metadata[key]}`;
      }
    })
    ?.join(', ');
  string += '.';
  return string;
};

export default JiraIssue;
