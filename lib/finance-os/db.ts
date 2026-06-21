// IndexedDB wrapper for the Finance OS. Stores ONLY non-transactional data:
// settings, reusable templates, commission plans, and explicitly-saved
// workspaces. Uploaded transactional rows are never written here automatically.

const DB_NAME = "nexera-finance-os";
const DB_VERSION = 1;

export type StoreName = "settings" | "templates" | "plans" | "savedWorkspaces";
const STORES: StoreName[] = ["settings", "templates", "plans", "savedWorkspaces"];

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB unavailable (server or unsupported browser)"));
  }
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const s of STORES) {
        if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(store: StoreName, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = fn(t.objectStore(store));
        req.onsuccess = () => resolve(req.result as T);
        req.onerror = () => reject(req.error);
      }),
  );
}

/** Any record stored must carry a string `id`. */
export type Stored = { id: string; [k: string]: unknown };

export const dbGet = <T extends Stored>(store: StoreName, id: string) =>
  tx<T | undefined>(store, "readonly", (s) => s.get(id));

export const dbSet = <T extends Stored>(store: StoreName, value: T) =>
  tx<IDBValidKey>(store, "readwrite", (s) => s.put(value)).then(() => value);

export const dbList = <T extends Stored>(store: StoreName) =>
  tx<T[]>(store, "readonly", (s) => s.getAll());

export const dbRemove = (store: StoreName, id: string) =>
  tx<void>(store, "readwrite", (s) => s.delete(id));
