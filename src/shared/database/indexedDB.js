const DB_NAME = "VITAssistDB";
const DB_VERSION = 1;
const STORE = "documents";

let db = null;

export async function getDB() {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const database = req.result;

      if (!database.objectStoreNames.contains(STORE)) {
        const store = database.createObjectStore(STORE, {
          keyPath: "id",
        });

        store.createIndex("subject", "subject");
        store.createIndex("lectureTitle", "lectureTitle");
        store.createIndex("moduleNumber", "moduleNumber");
      }
    };

    req.onsuccess = () => {
      db = req.result;
      resolve(db);
    };

    req.onerror = () => reject(req.error);
  });
}

export async function saveDocument(document) {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");

    tx.objectStore(STORE).put(document);

    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

export async function getDocument(id) {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");

    const req = tx.objectStore(STORE).get(id);

    req.onsuccess = () => resolve(req.result);

    req.onerror = () => reject(req.error);
  });
}

export async function getAllDocuments() {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");

    const req = tx.objectStore(STORE).getAll();

    req.onsuccess = () => resolve(req.result);

    req.onerror = () => reject(req.error);
  });
}

export async function deleteDocument(id) {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");

    tx.objectStore(STORE).delete(id);

    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}