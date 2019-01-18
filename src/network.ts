import { toPromise } from './utils';

export const sizeOf = (resp: Response) => {
  const length = resp.headers.get('Content-Length');
  return Number(length) || 0;
};

type TChunkCallback = (chunk: Uint8Array) => void | Promise<any>;

interface IReadLoopParams {
  reader: ReadableStreamReader;
  onChunk: TChunkCallback;
  onSuccess: () => void;
  onError: (err: any) => void;
}

const loopOverStream = (params: IReadLoopParams) => {
  const { reader, onChunk, onSuccess, onError } = params;
  const reading = reader.read();

  reading
    .then((result) => {
      if (result.done && result.value === undefined) {
        onSuccess();
        onChunk(new Uint8Array());
        return;
      }

      const next = toPromise(onChunk(result.value));
      return next.then(() => loopOverStream(params));
    })
    .catch(onError);
};

export const readStream = (reader: ReadableStreamReader, callback: TChunkCallback) => {
  return new Promise((resolve, reject) => {
    loopOverStream({
      reader,
      onChunk: callback,
      onSuccess: resolve,
      onError: reject,
    });
  });
};
