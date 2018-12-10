import Ram from './ram';
import Idb from './idb';

import { sizeOf, readStream } from './network';
import { createFileBlock, createEmptyBlock } from './tar';

type TName = string | Promise<string> | ((resp: Response) => string | Promise<string>);
type TEntry = [TName, string];

interface IPerformEntryProps {
  entries: TEntry[];
  storage: IStorage;
  onProgress: (value: number) => void;
}

interface IDefaultProps {
  entries: TEntry[];
  onProgress?: (value: number, max: number) => void;
}

interface IStorage {
  addBlob: (blob: Blob) => Promise<any>;
  getBlobs: () => Promise<Blob[]>;
}

const BLOCK_SIZE = 512;

const later = (fn: () => void) => setTimeout(fn, 0);

const toPromise = <T>(target: T | Promise<T>) => {
  const t = typeof target === 'function' ? target() : target;
  return t instanceof Promise ? t : Promise.resolve(t);
};

const resolveName = (target: TName, response: Response) => {
  const result = typeof target === 'function' ? target(response) : target;
  return toPromise(result) as Promise<string>;
};

const perform = async (props: IPerformEntryProps, i = 0) => {
  const { entries, storage, onProgress } = props;
  const entry = entries[i];

  if (entry == null) return;

  const [tname, url] = entry;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Can't fetch given url "${url}"`);
  }

  const name = await resolveName(tname, response);
  const size = sizeOf(response);

  // Some browser do not support body and body.getReader()
  // We just use whole blob
  if (response.body == null) {
    const blob = await response.blob();
    await storage.addBlob(blob);
    onProgress(blob.size / size);
    await perform(props, i + 1);
    return;
  }

  const reader = response.body.getReader();
  const padding = BLOCK_SIZE - (size % BLOCK_SIZE);

  await storage.addBlob(createFileBlock({ name, size }));

  await readStream(reader, (chunk) => {
    onProgress(chunk.length / size);
    return storage.addBlob(new Blob([chunk]));
  });

  await storage.addBlob(createEmptyBlock(padding));
  await perform(props, i + 1);

  const blobs = await storage.getBlobs();

  return new Blob(blobs);
};

export default ({ entries, onProgress }: IDefaultProps): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const storage = window.indexedDB ? new Idb() : new Ram();
    const entryCount = entries.length;
    let progress = 0;

    const performer = perform({
      entries,
      storage,
      onProgress: (value) => {
        progress += value;
        if (onProgress) onProgress(progress, entryCount);
      },
    });

    performer.then((blob) => {
      if (onProgress) onProgress(entryCount, entryCount);
      later(() => storage.teardown());
      resolve(blob);
    });

    performer.catch((err) => {
      later(() => storage.teardown());
      reject(err);
    });
  });
};
