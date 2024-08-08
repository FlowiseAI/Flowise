class Vector {
  constructor(id, metadata, values) {
    this.id = id;
    this.metadata = Vector.flattenObject(metadata);

    this.values = values;
  }

  static removeObjNulls(obj) {
    return Object.fromEntries(
      Object.entries(obj).filter(([key, value]) => value !== null && value !== undefined)
    );
  }

  static flattenObject(ob) {
    let toReturn = {};

    for (let i in ob) {
      if (!ob.hasOwnProperty(i)) continue;

      if (typeof ob[i] == 'object') {
        let flatObject = Vector.flattenObject(ob[i]);
        for (let x in flatObject) {
          if (!flatObject.hasOwnProperty(x)) continue;
          toReturn[i + x.charAt(0).toUpperCase() + x.slice(1)] = flatObject[x];
        }
      } else {
        toReturn[i] = ob[i];
      }
    }
    toReturn = this.removeObjNulls(toReturn);
    return toReturn;
  }
}

export default Vector;
