import { later, toPromise } from './utils';
import Ram from './ram';
import Idb from './idb';

import { sizeOf, readStream } from './network';
import { createFileBlock, createEmptyBlock } from './tar';

type TName = string | Promise<string> | ((resp: Response) => string | Promise<string>);
type TProgress = (value: number) => void;
type TPerformer = (props: IPerformerProps) => void;

interface ICancelable {
  cancel: () => void;
  check: () => void;
}

interface IPerformerProps {
  fileName: string;
  response: Response;
  storage: IStorage;
  cancelable: ICancelable;
  onProgress: TProgress;
}

interface IEntry {
  name: TName;
  src: string;
}

interface ILoopProps {
  entries: IEntry[];
  storage: IStorage;
  cancelable: ICancelable;
  onProgress: TProgress;
}

interface IPerformProps {
  entries: IEntry[];
  cancelable: ICancelable;
  onProgress?: (value: number, max: number) => void;
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
    progress = Math.random() * (progress / 1.2);
    return progress;
  };
};

const createCancelable = (): ICancelable => {
  let cancelled = false;

  return {
    cancel: () => { cancelled = true; },
    check: () => {
      if (cancelled) throw new Error('fetchToTar cancelled');
    },
  };
};

const performBlob: TPerformer = async (props: IPerformerProps) => {
  let timer: any = null;

  try {
    const { storage, response, cancelable, onProgress, fileName } = props;
    const pseudoProgress = createPseudoProgress();

    cancelable.check();

    const tick = () => {
      onProgress(pseudoProgress());
      cancelable.check();
    };

    timer = setInterval(tick, 500);

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
  const { storage, response, fileName, cancelable, onProgress } = props;
  const reader = (response.body as ReadableStream).getReader();
  const pseudoProgress = createPseudoProgress();
  const size = sizeOf(response);
  let realSize = 0;

  await storage.addBlob(createEmptyBlock());
  const { cursor } = storage;

  await readStream(reader, (chunk) => {
    cancelable.check();
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

const loop = async (props: ILoopProps, i = 0) => {
  try {
    const { entries, storage, onProgress, cancelable } = props;
    const entry = entries[i];

    if (entry == null) return;

    const { name, src } = entry;
    const response = await fetch(src);

    if (!response.ok) {
      throw new Error(`Can't fetch given url "${src}"`);
    }

    const fileName = await resolveName(name, response);

    const perfomerProps = {
      fileName,
      response,
      storage,
      onProgress,
      cancelable,
    };

    if (response.body) {
      await performStream(perfomerProps);
    } else {
      await performBlob(perfomerProps);
    }

    await loop(props, i + 1);
  } catch (e) {
    console.log('ASDADASDA');
    throw e;
  }
};

const perform = async ({ entries, cancelable , onProgress }: IPerformProps): Promise<Blob> => {
  const storage = window.indexedDB ? new Idb() : new Ram();
  const entryCount = entries.length;

  let progress = 0;
  let blobs: Blob[] | null = null;

  try {
    await loop({
      entries,
      storage,
      cancelable,
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

export default (props: IDefaultProps) => {
  const cancelable = createCancelable();
  const promise = perform({ ...props, cancelable });

  return {
    promise,
    cancel: cancelable.cancel,
  };
};
