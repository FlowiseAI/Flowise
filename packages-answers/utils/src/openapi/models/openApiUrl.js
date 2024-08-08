import WebObject from './webObject';

class WebPage extends WebObject {
  constructor(webPage) {
    const tidiedPage = WebPage.tidy(webPage);
    super(tidiedPage);
    this.object.objectType = 'Web Page';
    this.object.uid = webPage.url;
    this.object.url = webPage.url;
  }

  static tidy(webPage) {
    const { url, html } = webPage;
    const attrs = {
      objectType: 'Web Page',
      url: url,
      content: WebObject.webToMarkdown(html)
    };

    return {
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
        return `${key} is ${metadata[key]}`;
      }
    })
    ?.join(', ');
  string += '.';
  return string;
};

export default WebPage;
