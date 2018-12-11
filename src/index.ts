import { later, toPromise } from './utils';
import Ram from './ram';
import Idb from './idb';

import { sizeOf, readStream } from './network';
import { createFileBlock, createEmptyBlock } from './tar';

type TName = string | Promise<string> | ((resp: Response) => string | Promise<string>);

interface IEntry {
  name: TName;
  src: string;
}

interface IPerformEntryProps {
  entries: IEntry[];
  storage: IStorage;
  onProgress: (value: number) => void;
}

interface IDefaultProps {
  entries: IEntry[];
  onProgress?: (value: number, max: number) => void;
}

interface IStorage {
  cursor: number;
  addBlob: (blob: Blob) => Promise<any>;
  putBlob: (key: any, blob: Blob) => Promise<any>;
  getBlobs: () => Promise<Blob[]>;
}

const BLOCK_SIZE = 512;

const resolveName = (target: TName, response: Response) => {
  const result = typeof target === 'function' ? target(response) : target;
  return toPromise(result) as Promise<string>;
};

const perform = async (props: IPerformEntryProps, i = 0) => {
  const { entries, storage, onProgress } = props;
  const entry = entries[i];

  if (entry == null) return;

  const { name, src } = entry;

  const response = await fetch(src);

  if (!response.ok) {
    throw new Error(`Can't fetch given url "${src}"`);
  }

  const fileName = await resolveName(name, response);
  const size = sizeOf(response);
  let realSize = 0;

  // Some browser do not support body and body.getReader()
  // We just use whole blob
  if (response.body == null) {
    const blob = await response.blob();
    realSize = blob.size;
    await storage.addBlob(blob);
    onProgress(1);
    await perform(props, i + 1);
    return;
  }

  const reader = response.body.getReader();
  await storage.addBlob(createFileBlock({ size, name: fileName }));
  const headIndex = storage.cursor;

  await readStream(reader, (chunk) => {
    realSize += chunk.length;

    let pseudoSize = 1;

    if (size !== 0) {
      onProgress(chunk.length / size);
    } else {
      pseudoSize = pseudoSize / 42;
      onProgress(pseudoSize);
    }

    return storage.addBlob(new Blob([chunk]));
  });

  if (size !== realSize) {
    await storage.putBlob(headIndex, createFileBlock({
      size: realSize,
      name: fileName,
    }));
  }

  const padding = BLOCK_SIZE - ((size || realSize) % BLOCK_SIZE);
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
