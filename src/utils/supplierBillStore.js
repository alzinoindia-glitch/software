const DB_NAME = 'ALZINO_SUPPLIER_BILLS';
const STORE_NAME = 'documents';
let databasePromise;

const openDatabase = () => {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('Browser file storage is unavailable'));
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return databasePromise;
};

export async function saveSupplierBillDocument(id, file) {
  const db = await openDatabase();
  await new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(file, id);
    request.onsuccess = resolve;
    request.onerror = () => reject(request.error);
  });
}

export async function getSupplierBillDocument(id) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}
