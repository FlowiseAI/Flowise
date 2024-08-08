import JiraObject from "./jiraObject";

class JiraStatus extends JiraObject {
  constructor(status) {
    const tidiedStatus = JiraStatus.tidy(status);
    super(tidiedStatus);
    this.object.objectType = "JIRA Status";
    this.object.statusCategoryId = status?.statusCategory?.id;
    this.object.uid = status.id;
  }

  static tidy(status) {
    const removeFields = [
      "untranslatedName",
      "scope",
      "iconUrl",
      "self",
      "colorname",
      "key",
      "statusCategory",
    ];

    removeFields.forEach((fieldName) => {
      delete status[fieldName];
    });

    return status;
  }
}

export default JiraStatus;
