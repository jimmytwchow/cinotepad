type LSTransformer = {
  transform(chunk: string, controller: TransformStreamDefaultController): void;
  flush(controller: TransformStreamDefaultController): void;
  options?: object;
  remainChunk?: string;
};

const ls: LSTransformer = {
  transform(chunk: string, controller: TransformStreamDefaultController) {
    let startIndex: number = 0;
    let endIndex: number;
    while (true) {
      endIndex = chunk.indexOf("\n", startIndex);
      if (endIndex > -1) {
        let line: string = chunk.substring(startIndex, endIndex);
        line = line.replace(new RegExp("\\r", "g"), "");
        if (this.remainChunk) {
          line = (this.remainChunk as string) + line;
          delete this.remainChunk;
        }
        controller.enqueue(line);
        startIndex = endIndex + 1;
      } else {
        let line: string = chunk.substring(startIndex);
        line = line.replace(new RegExp("\\r", "g"), "");
        if (line.length == 0) {
          if (this.remainChunk) {
            line = (this.remainChunk as string) + line;
            controller.enqueue(line);
            delete this.remainChunk;
          }
        } else {
          this.remainChunk = this.remainChunk ?? "" + line;
        }
        break;
      }
    }
  },
  flush(controller: TransformStreamDefaultController) {
    if (this.remainChunk) {
      controller.enqueue(this.remainChunk as string);
      delete this.remainChunk;
    }
  },
};

export default class JSLineStream extends TransformStream {
  public constructor({ ...options } = {}) {
    let t: LSTransformer = { ...ls, options };

    super(t);
  }
}
