type IndexedDB = IDBDatabase & { setVersion?: any };
type IndexedDBEvent = EventTarget & { result: IndexedDB };

const DEFAULT_STORE_NAME = 'chunks';
let uid = 0;

export default class Idb {
  private idb: IndexedDB | null;
  private name: string;

  constructor(name?: string) {
    this.idb = null;
    this.name = name || `__FETCH_TO_TAR_IDB__.${Date.now()}`;
  }

  addBlob(blob: Blob) {
    return new Promise((resolve, reject) => {
      this.indexedDb()
        .then((idb) => {
          uid += 1;

          const tx = idb.transaction([DEFAULT_STORE_NAME], 'readwrite');

          tx.oncomplete = resolve;
          tx.onerror = reject;

          tx.objectStore(DEFAULT_STORE_NAME).add(blob, uid);
        })
        .catch(reject);
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

  private indexedDb() {
    if (this.idb) return Promise.resolve(this.idb);

    return new Promise<IndexedDB>((resolve, reject) => {
      const request = indexedDB.open(this.name, 1);

      request.onsuccess = () => {
        const idb = request.result as IndexedDB;

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
