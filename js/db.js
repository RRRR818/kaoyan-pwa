/* ===== IndexedDB 数据库封装 ===== */
const DB_NAME = 'kaoyan-db';
const DB_VERSION = 1;

let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains('subjects')) {
        d.createObjectStore('subjects', { keyPath: 'id' });
      }
      if (!d.objectStoreNames.contains('chapters')) {
        const chaptersStore = d.createObjectStore('chapters', { keyPath: 'id' });
        chaptersStore.createIndex('subjectId', 'subjectId', { unique: false });
        chaptersStore.createIndex('nextReview', 'nextReview', { unique: false });
      }
      if (!d.objectStoreNames.contains('studyLogs')) {
        d.createObjectStore('studyLogs', { keyPath: 'id', autoIncrement: true });
      }
      if (!d.objectStoreNames.contains('images')) {
        d.createObjectStore('images', { keyPath: 'id', autoIncrement: true });
      }
      if (!d.objectStoreNames.contains('dailyPlan')) {
        d.createObjectStore('dailyPlan', { keyPath: 'date' });
      }
      if (!d.objectStoreNames.contains('settings')) {
        d.createObjectStore('settings', { keyPath: 'key' });
      }
      if (!d.objectStoreNames.contains('analysisResults')) {
        d.createObjectStore('analysisResults', { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = (e) => { db = e.target.result; resolve(db); };
    req.onerror = () => reject(req.error);
  });
}

// ---- 通用 CRUD ----

function dbGetAll(storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dbGet(storeName, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dbPut(storeName, item) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).put(item);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dbDelete(storeName, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function dbGetByIndex(storeName, indexName, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).index(indexName).getAll(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dbGetByIndexRange(storeName, indexName, lower, upper) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const range = IDBKeyRange.bound(lower, upper);
    const req = tx.objectStore(storeName).index(indexName).getAll(range);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ---- 业务查询 ----

async function getChaptersBySubject(subjectId) {
  return dbGetByIndex('chapters', 'subjectId', subjectId);
}

async function getUpcomingReviews(days = 7) {
  const today = formatDate(new Date());
  const end = formatDate(addDays(new Date(), days));
  return dbGetByIndexRange('chapters', 'nextReview', today, end);
}

async function getOverdueReviews() {
  const today = formatDate(new Date());
  const all = await dbGetAll('chapters');
  return all.filter(c => c.nextReview && c.nextReview < today && c.status !== 'expert');
}

async function getWeakestChapters(limit = 5) {
  const all = await dbGetAll('chapters');
  return all
    .filter(c => c.status !== 'unstarted' && c.status !== 'expert')
    .sort((a, b) => (a.masteryLevel || 0) - (b.masteryLevel || 0))
    .slice(0, limit);
}

async function getTodayStudyLogs() {
  const today = formatDate(new Date());
  const all = await dbGetAll('studyLogs');
  return all.filter(l => l.date === today);
}

async function getTodayPlan() {
  const today = formatDate(new Date());
  return dbGet('dailyPlan', today);
}

async function getSetting(key, defaultValue = null) {
  const item = await dbGet('settings', key);
  return item ? item.value : defaultValue;
}

async function setSetting(key, value) {
  return dbPut('settings', { key, value });
}

// ---- 工具函数 ----

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(date, days) {
  const r = new Date(date);
  r.setDate(r.getDate() + days);
  return r;
}

function daysBetween(d1, d2) {
  return Math.round((new Date(d2) - new Date(d1)) / 86400000);
}

function todayStr() {
  return formatDate(new Date());
}
