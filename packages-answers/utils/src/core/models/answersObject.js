// import natural from "natural";
// const tokenizer = new natural.WordTokenizer();
import OpenAI from '../../openai/openai';
import Vector from '../../utilities/vector';

const embeddingJoinSeparator = ' ';
const openAi = new OpenAI();
class AnswersObject {
  constructor(object) {
    this.object = object;
  }

  getContext() {
    return this.createContextFromObject(this.object);
  }

  // getTokenCount() {
  //   return tokenizer.tokenize(this.context);
  // }

  createContextFromObject(obj) {
    const trimValues = ['', undefined, null, 'indeterminate'];
    if (obj?.text) return obj?.text;
    let context = Object.entries(obj)
      .filter(([, value]) => !trimValues.includes(value) && typeof value !== 'object')
      .map(([key, value]) => `${key.replace(/([A-Z_])/g, ' $1').toUpperCase()}: ${value}`)
      .join(embeddingJoinSeparator);

    return context;
  }

  async prepareForEmbedding() {
    this.context = await this.getContext();
    // this.tokens = await this.getTokenCount();
    this.embedding = await this.createEmbedding();
    this.vector = this.createVector();
    return this.vector;
  }

  async createEmbedding() {
    const embedding = await openAi.createEmbedding(this.context);
    return embedding;
  }

  createVector() {
    const objectType = this.object.objectType?.replace(/\s/g, '')?.toLowerCase();
    const uid = this.object.uid;
    const id = `${objectType}_${uid}`;
    const vector = new Vector(id, this.object, this.embedding);

    return vector;
  }
}

export default AnswersObject;
