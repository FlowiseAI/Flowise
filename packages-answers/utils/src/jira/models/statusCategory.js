import JiraObject from "./jiraObject";

class JiraStatusCategory extends JiraObject {
  constructor(statusCategory) {
    const tidiedStatusCategory = JiraStatusCategory.tidy(statusCategory);
    super(tidiedStatusCategory);
    this.object.objectType = "JIRA Status Category";
    this.object.uid = statusCategory.id;
  }

  static tidy(statusCategory) {
    const removeFields = ["self", "colorName", "key"];
    removeFields.forEach((fieldName) => {
      delete statusCategory[fieldName];
    });
    return statusCategory;
  }
}

export default JiraStatusCategory;
