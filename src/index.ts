import { later, toPromise } from './utils';
import Ram from './ram';
import Idb from './idb';

import { sizeOf, readStream } from './network';
import { createFileBlock, createEmptyBlock } from './tar';

type TName = string | Promise<string> | ((resp: Response) => string | Promise<string>);
type TProgress = (value: number) => void;
type TPerformer = (props: IPerformerProps) => void;

interface IPerformerProps {
  fileName: string;
  response: Response;
  storage: IStorage;
  onProgress: TProgress;
}

interface IEntry {
  name: TName;
  src: string;
}

interface IPerformEntryProps {
  entries: IEntry[];
  storage: IStorage;
  onProgress: TProgress;
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

const createPseudoProgress = () => {
  let progress = 1;

  return () => {
    progress = Math.random() * (progress / 1.1);
    return progress;
  };
};

const performBlob: TPerformer = async (props: IPerformerProps) => {
  const { storage, response, onProgress, fileName } = props;
  const pseudoProgress = createPseudoProgress();
  const timer = setInterval(() => onProgress(pseudoProgress()), 250);

  try {
    const blob = await response.blob();
    const size = blob.size;
    const padding = BLOCK_SIZE - (size % BLOCK_SIZE);

    await storage.addBlob(createFileBlock({ size, name: fileName }));
    await storage.addBlob(blob);
    await storage.addBlob(createEmptyBlock(padding));
  } catch (e) {
    throw e;
  } finally {
    clearTimeout(timer);
  }
};

const performStream: TPerformer = async (props: IPerformerProps) => {
  const { storage, response, onProgress, fileName } = props;
  const reader = (response.body as ReadableStream).getReader();
  const pseudoProgress = createPseudoProgress();
  const size = sizeOf(response);
  let realSize = 0;

  await storage.addBlob(createEmptyBlock());
  const { cursor } = storage;

  await readStream(reader, (chunk) => {
    realSize += chunk.length;
    onProgress(size !== 0 ? chunk.length / size : pseudoProgress());
    return storage.addBlob(new Blob([chunk]));
  });

  const padding = BLOCK_SIZE - (realSize % BLOCK_SIZE);
  await storage.addBlob(createEmptyBlock(padding));

  await storage.putBlob(cursor, createFileBlock({
    size: realSize,
    name: fileName,
  }));
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

  if (response.body) {
    await performStream({ fileName, response, storage, onProgress });
  } else {
    await performBlob({ fileName, response, storage, onProgress });
  }

  await perform(props, i + 1);
};

export default async ({ entries, onProgress }: IDefaultProps): Promise<Blob> => {
  const storage = window.indexedDB ? new Idb() : new Ram();
  const entryCount = entries.length;

  let progress = 0;
  let blobs: Blob[] | null = null;

  try {
    await perform({
      entries,
      storage,
      onProgress: (value) => {
        progress += value;
        if (onProgress) onProgress(progress, entryCount);
      },
    });

    blobs = await storage.getBlobs();

    if (onProgress) onProgress(entryCount, entryCount);
  } catch (e) {
    console.error(e);
  } finally {
    later(() => storage.teardown());
  }

  if (blobs == null) {
    throw new Error("Can't build tar archive from empty blobs");
  }

  return new Blob(blobs);
};
