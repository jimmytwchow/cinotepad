type TDSTransformer = {
  start(): void;
  transform(
    chunk: AllowSharedBufferSource,
    controller: TransformStreamDefaultController
  ): void;
  decoder?: TextDecoder;
  encoding?: string;
  options?: object;
};

const tds: TDSTransformer = {
  start() {
    this.decoder = new TextDecoder(this.encoding, this.options);
  },
  transform(
    chunk: AllowSharedBufferSource,
    controller: TransformStreamDefaultController
  ) {
    if (this.decoder) {
      controller.enqueue(
        (this.decoder as TextDecoder).decode(chunk, { stream: true })
      );
    } else {
      controller.enqueue(chunk);
    }
  },
};

export default class JSTextDecoderStream extends TransformStream {
  public constructor(encoding = "utf-8", { ...options } = {}) {
    let t: TDSTransformer = { ...tds, encoding, options };

    super(t);
    this.tds = t;
  }

  private tds: TDSTransformer;

  public get encoding(): string {
    return this.tds.decoder?.encoding ?? "utf-8";
  }

  public get fatal(): boolean {
    return this.tds.decoder?.fatal ?? false;
  }

  public get ignoreBOM(): boolean {
    return this.tds.decoder?.ignoreBOM ?? false;
  }
}
