import AnswersObject from "../../core/models/answersObject";

class SlackObject extends AnswersObject {
  constructor(object) {
    super(object);
  }

  static convertTimestampToDate(timestamp) {
    if (!timestamp) return null;
    const unixTimestamp = parseInt(timestamp.split(".")[0]); // remove the microseconds
    if (isNaN(unixTimestamp)) throw new Error("Date is invalid");
    const date = new Date(unixTimestamp * 1000); // multiply by 1000 to convert to milliseconds
    return date;
  }
}

export default SlackObject;
