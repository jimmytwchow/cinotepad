const ls = {
  transform(chunk, controller) {
    let startIndex = 0;
    let endIndex;
    while (true) {
      endIndex = chunk.indexOf("\n", startIndex);
      if (endIndex > -1) {
        let line = chunk.substring(startIndex, endIndex);
        line = line.replaceAll("\r", "");
        if (this._remainChunk) {
          line = this._remainChunk + line;
          this._remainChunk = undefined;
        }
        controller.enqueue(line);
        startIndex = endIndex + 1;
      } else {
        let line = chunk.substring(startIndex);
        line = line.replaceAll("\r", "");
        if (line.length == 0) {
          if (this._remainChunk) {
            line = this._remainChunk + line;
            controller.enqueue(line);
            this._remainChunk = undefined;
          }
        } else {
          if (!this._remainChunk) {
            this._remainChunk = "";
          }
          this._remainChunk += line;
        }
        break;
      }
    }
  },
  flush(controller) {
    if (this._remainChunk) {
      controller.enqueue(this._remainChunk);
      this._remainChunk = undefined;
    }
  },
};

export default class JSLineStream extends TransformStream {
  constructor({ ...options } = {}) {
    let t = { ...ls, options };

    super(t);
  }
}
