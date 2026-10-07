/**
 * One-time move of saved browser data from the old "qatrial" names to the
 * "pta-qms" names.
 *
 * zustand `persist` reads localStorage the moment a store module is first
 * imported, so the keys have to be renamed before any store is loaded, or a
 * store would start empty and then overwrite the old data on its first save.
 *
 * The guaranteed first run is the inline <script> in index.html: in the
 * production bundle, shared store chunks are evaluated BEFORE main.tsx's own
 * code, so an import here alone is too late for some stores. This module is
 * still the first import in main.tsx as a safety net (dev mode, or if the
 * inline script was skipped); once the flag is set its localStorage step does
 * nothing. Keep both copies of the rename rule identical.
 *
 * Rules for localStorage:
 *  - every key starting with "qatrial:" moves to the same key with "pta-qms:".
 *  - if the new key already exists, the new key wins (it is never overwritten).
 *  - the old key is removed afterwards.
 *  - "pta-qms:keys-migrated" = "1" marks the job done so it runs only once.
 *
 * The offline mutation queue in IndexedDB ("qatrial-offline") is copied into
 * "pta-qms-offline" and the old database is deleted. That part is async and
 * best-effort: it can never block or break app start.
 *
 * Everything is wrapped in try/catch: private mode or blocked storage must
 * never stop the app from loading.
 */

const OLD_PREFIX = 'qatrial:';
const NEW_PREFIX = 'pta-qms:';
const DONE_FLAG = 'pta-qms:keys-migrated';

export const OLD_OFFLINE_DB = 'qatrial-offline';
export const OFFLINE_DB = 'pta-qms-offline';
const OFFLINE_STORE = 'mutations';

/** Map an old "qatrial:x" key to "pta-qms:x". Other keys come back unchanged. */
export function toNewKey(key: string): string {
  return key.startsWith(OLD_PREFIX) ? NEW_PREFIX + key.slice(OLD_PREFIX.length) : key;
}

function migrateLocalStorage(): void {
  try {
    if (localStorage.getItem(DONE_FLAG) === '1') return;

    // Collect first: removing keys while walking localStorage shifts the indexes.
    const oldKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(OLD_PREFIX)) oldKeys.push(key);
    }

    for (const oldKey of oldKeys) {
      try {
        const value = localStorage.getItem(oldKey);
        const newKey = toNewKey(oldKey);
        if (value !== null && localStorage.getItem(newKey) === null) {
          localStorage.setItem(newKey, value);
        }
        // Only drop the old copy once the new key surely holds data.
        if (localStorage.getItem(newKey) !== null) {
          localStorage.removeItem(oldKey);
        }
      } catch (error) {
        // Quota or a single bad key: keep the old key so nothing is lost.
        console.warn('[migrate] Could not move key', oldKey, error);
      }
    }

    localStorage.setItem(DONE_FLAG, '1');
  } catch (error) {
    console.warn('[migrate] localStorage not available; skipped key rename.', error);
  }
}

function idbRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Opens the old DB only if it already exists. Resolves null when it does not. */
function openOldDbIfPresent(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    let existed = true;
    const req = indexedDB.open(OLD_OFFLINE_DB);
    req.onupgradeneeded = () => {
      // An upgrade on open means the DB did not exist: cancel so we do not create it.
      existed = false;
      req.transaction?.abort();
    };
    req.onsuccess = () => {
      if (existed) {
        resolve(req.result);
      } else {
        req.result.close();
        resolve(null);
      }
    };
    req.onerror = () => resolve(null);
    req.onblocked = () => resolve(null);
  });
}

function openNewDb(): Promise<IDBDatabase> {
  const req = indexedDB.open(OFFLINE_DB, 1);
  req.onupgradeneeded = () => {
    const db = req.result;
    if (!db.objectStoreNames.contains(OFFLINE_STORE)) {
      db.createObjectStore(OFFLINE_STORE, { keyPath: 'id', autoIncrement: true });
    }
  };
  return idbRequest(req);
}

async function migrateOfflineQueue(): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const oldDb = await openOldDbIfPresent();
  if (!oldDb) {
    // Clean up an empty DB left behind by the existence check, if any.
    indexedDB.deleteDatabase(OLD_OFFLINE_DB);
    return;
  }

  let items: Record<string, unknown>[] = [];
  if (oldDb.objectStoreNames.contains(OFFLINE_STORE)) {
    const tx = oldDb.transaction(OFFLINE_STORE, 'readonly');
    items = await idbRequest(tx.objectStore(OFFLINE_STORE).getAll());
  }
  oldDb.close();

  if (items.length > 0) {
    const newDb = await openNewDb();
    await new Promise<void>((resolve, reject) => {
      const tx = newDb.transaction(OFFLINE_STORE, 'readwrite');
      const store = tx.objectStore(OFFLINE_STORE);
      for (const item of items) {
        // Drop the old auto id so the new store gives a fresh one.
        const { id: _oldId, ...rest } = item;
        void _oldId;
        store.add(rest);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    newDb.close();
  }

  // Only delete the old DB after the copy has committed.
  indexedDB.deleteDatabase(OLD_OFFLINE_DB);
}

migrateLocalStorage();

/** Resolves when the offline-queue move is finished (or skipped). Never rejects. */
export const offlineQueueMigration: Promise<void> = (async () => {
  try {
    await migrateOfflineQueue();
  } catch (error) {
    console.warn('[migrate] Offline queue move skipped.', error);
  }
})();
