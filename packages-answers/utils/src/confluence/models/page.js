import ConfluenceObject from './confluenceObject';

class ConfluencePage extends ConfluenceObject {
  constructor(page) {
    const tidiedPage = ConfluencePage.tidy(page);
    super(tidiedPage);
    this.object.objectType = 'Confluence Page';
    this.object.uid = page.id;
  }

  static tidy(page) {
    const { id, title, body } = page;
    const attrs = {
      objectType: 'Confluence Page',
      title: title?.toLowerCase(),
      text: ConfluencePage.confluenceToMarkdown(body)
    };
    return {
      ...attrs,
      text: createContext(id, attrs)
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

export default ConfluencePage;
