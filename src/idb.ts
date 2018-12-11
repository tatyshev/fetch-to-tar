type IndexedDB = IDBDatabase & { setVersion?: any };
type IndexedDBEvent = EventTarget & { result: IndexedDB };

interface ITrack {
  [key: string]: {
    updatedAt: number,
  };
}

const DEFAULT_STORE_NAME = 'chunks';
const PREFIX = '__FETCH_TO_TAR_IDB__';
const TTL = 30 * 60 * 1000; // 30 minutes

export default class Idb {
  cursor = 0;
  private idb: IndexedDB | null;
  private name: string;

  constructor(name?: string) {
    this.idb = null;
    this.name = name || `${PREFIX}.${Date.now()}`;
  }

  addBlob(blob: Blob) {
    this.updated();

    return new Promise((resolve, reject) => {
      this.indexedDb()
        .then((idb) => {
          this.cursor += 1;

          const tx = idb.transaction([DEFAULT_STORE_NAME], 'readwrite');

          tx.oncomplete = resolve;
          tx.onerror = reject;

          tx.objectStore(DEFAULT_STORE_NAME).add(blob, this.cursor);
        })
        .catch(reject);
    });
  }

  putBlob(key: any, blob: Blob) {
    this.updated();

    return new Promise((resolve, reject) => {
      this.indexedDb()
        .then((idb) => {
          const tx = idb.transaction([DEFAULT_STORE_NAME], 'readwrite');

          tx.oncomplete = resolve;
          tx.onerror = reject;

          tx.objectStore(DEFAULT_STORE_NAME).put(blob, key);
        });
    });
  }

  getBlobs(): Promise<Blob[]> {
    return new Promise((resolve, reject) => {
      const blobs: Blob[] = [];

      this.indexedDb()
        .then((idb) => {
          const tx = idb.transaction([DEFAULT_STORE_NAME], 'readonly');
          const store = tx.objectStore(DEFAULT_STORE_NAME);
          const cursorReq = store.openCursor();

          cursorReq.onerror = reject;

          cursorReq.onsuccess = (event) => {
            type TTarget = EventTarget & { result: IDBCursorWithValue };
            const cursor = (event.target as TTarget).result;

            if (cursor) {
              blobs.push(cursor.value as Blob);
              cursor.continue();
            } else {
              resolve(blobs);
            }
          };
        })
        .catch(reject);
    });
  }

  teardown() {
    return new Promise((resolve, reject) => {
      const req = window.indexedDB.deleteDatabase(this.name);

      req.onsuccess = resolve;
      req.onerror = reject;
    });
  }

  private updated() {
    const stored = window.localStorage[PREFIX];
    const now = Date.now();
    let databases: ITrack = {};

    if (stored) {
      try {
        databases = JSON.parse(stored);
      } catch (e) {
        console.warn('fetchToTar: JSON.parse error');
      }
    }

    const names = Object.keys(databases);

    names.forEach((name) => {
      const { updatedAt } = databases[name];
      const diff = now - updatedAt;
      if (diff >= TTL) {
        window.indexedDB.deleteDatabase(name);
        delete databases[name];
      }
    });

    databases[this.name] = { updatedAt: now };
    window.localStorage[PREFIX] = JSON.stringify(databases);
  }

  private indexedDb() {
    if (this.idb != null) return Promise.resolve(this.idb);

    return new Promise<IndexedDB>((resolve, reject) => {
      const request = indexedDB.open(this.name, 1);

      request.onsuccess = () => {
        const idb = request.result as IndexedDB;

        this.idb = idb;
        resolve(idb);

        idb.onerror =  reject;

        if (idb.setVersion == null) return;
        if (idb.version === 1) return;

        const setVersion = idb.setVersion(1);
        setVersion.onsuccess = () => { idb.createObjectStore(DEFAULT_STORE_NAME); };
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const target = event.target as IndexedDBEvent | null;
        if (target) target.result.createObjectStore(DEFAULT_STORE_NAME);
      };
    });
  }
}
