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
  onError: () => void;
}

const loopOverStream = (params: IReadLoopParams) => {
  const { reader, onChunk, onSuccess, onError } = params;

  reader.read().then((result) => {
    if (result.done && result.value === undefined) {
      onSuccess();
      return;
    }

    const next = toPromise(onChunk(result.value));

    next.then(() => loopOverStream(params));
    next.catch(onError);
  });
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
