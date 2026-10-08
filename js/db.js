// Local IndexedDB for journals and focus logs (no server required)
(() => {
  const DB_NAME = 'simpleDay';
  const DB_VERSION = 1;
  let dbPromise = null;

  const openDb = () => {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error('IndexedDB unavailable'));
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('journals')) {
          db.createObjectStore('journals', { keyPath: 'date' });
        }
        if (!db.objectStoreNames.contains('focusLogs')) {
          db.createObjectStore('focusLogs', { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  };

  const lsGet = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  };

  const lsSet = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
  };

  window.SimpleDayDB = {
    async clearAll() {
      if (!window.indexedDB) return;
      const db = await openDb();
      await new Promise((resolve, reject) => {
        const transaction = db.transaction(['journals', 'focusLogs'], 'readwrite');
        transaction.objectStore('journals').clear();
        transaction.objectStore('focusLogs').clear();
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error || new Error('Failed to clear stored data'));
      });
    },

    async getJournal(date) {
      try {
        const db = await openDb();
        return await new Promise((resolve, reject) => {
          const req = db.transaction('journals', 'readonly').objectStore('journals').get(date);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => reject(req.error);
        });
      } catch (e) {
        const all = lsGet('simpleDay_journals', {});
        return all[date] ? { date, ...all[date] } : null;
      }
    },

    async saveJournal(date, html) {
      const record = { date, html, updatedAt: Date.now() };
      try {
        const db = await openDb();
        await new Promise((resolve, reject) => {
          const req = db.transaction('journals', 'readwrite').objectStore('journals').put(record);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      } catch (e) {
        const all = lsGet('simpleDay_journals', {});
        all[date] = { html, updatedAt: record.updatedAt };
        lsSet('simpleDay_journals', all);
      }
      return record;
    },

    async addFocusLog(entry) {
      const record = {
        id: entry.id || ('focus-' + Date.now() + '-' + Math.random().toString(16).slice(2)),
        date: entry.date,
        projectId: entry.projectId || '',
        projectTitle: entry.projectTitle || '',
        taskId: entry.taskId || '',
        taskTitle: entry.taskTitle || '',
        seconds: Math.max(0, Math.round(entry.seconds || 0)),
        mode: entry.mode || 'focus',
        endedAt: entry.endedAt || Date.now()
      };
      if (record.seconds < 1) return record;
      try {
        const db = await openDb();
        await new Promise((resolve, reject) => {
          const req = db.transaction('focusLogs', 'readwrite').objectStore('focusLogs').put(record);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      } catch (e) {
        const logs = lsGet('simpleDay_focus_logs', []);
        logs.push(record);
        lsSet('simpleDay_focus_logs', logs);
      }
      return record;
    },

    async getFocusLogs() {
      try {
        const db = await openDb();
        return await new Promise((resolve, reject) => {
          const req = db.transaction('focusLogs', 'readonly').objectStore('focusLogs').getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => reject(req.error);
        });
      } catch (e) {
        return lsGet('simpleDay_focus_logs', []);
      }
    }
  };
})();
