(() => {
  const readJson = (key, fallback) => {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      return fallback;
    }
  };

  const writeJson = (key, value) => localStorage.setItem(key, JSON.stringify(value));

  const migrateLegacyDatabase = async () => {
    if (localStorage.getItem('simpleDayLegacyDbMigrated') === 'true' || !window.indexedDB) return false;
    let createdDuringOpen = false;
    const db = await new Promise((resolve) => {
      const request = indexedDB.open('simpleDay');
      request.onupgradeneeded = () => {
        createdDuringOpen = true;
        request.transaction.abort();
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });
    if (!db || createdDuringOpen) {
      localStorage.setItem('simpleDayLegacyDbMigrated', 'true');
      return false;
    }

    const stores = ['journals', 'focusLogs'].filter((name) => db.objectStoreNames.contains(name));
    if (!stores.length) {
      db.close();
      localStorage.setItem('simpleDayLegacyDbMigrated', 'true');
      return false;
    }

    const records = await new Promise((resolve, reject) => {
      const transaction = db.transaction(stores, 'readonly');
      const reads = stores.map((name) => new Promise((readResolve, readReject) => {
        const request = transaction.objectStore(name).getAll();
        request.onsuccess = () => readResolve([name, request.result || []]);
        request.onerror = () => readReject(request.error);
      }));
      Promise.all(reads).then((entries) => resolve(Object.fromEntries(entries)), reject);
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();

    if (records.journals?.length) {
      const journals = readJson('simpleDay_journals', {});
      records.journals.forEach((record) => {
        if (record.date && !journals[record.date]) {
          journals[record.date] = { html: record.html || '', updatedAt: record.updatedAt || Date.now() };
        }
      });
      writeJson('simpleDay_journals', journals);
    }
    if (records.focusLogs?.length) {
      const logs = readJson('simpleDay_focus_logs', []);
      const knownIds = new Set(logs.map((record) => record.id));
      records.focusLogs.forEach((record) => {
        if (!knownIds.has(record.id)) logs.push(record);
      });
      writeJson('simpleDay_focus_logs', logs);
    }
    localStorage.setItem('simpleDayLegacyDbMigrated', 'true');
    return Boolean(records.journals?.length || records.focusLogs?.length);
  };

  const ready = window.SimpleDayCloud.ready.then(async (state) => {
    if (state.configured && !window.SimpleDayCloud.user) return false;
    return migrateLegacyDatabase();
  }).catch((error) => {
    console.warn('Could not migrate the previous local database', error);
    return false;
  });

  window.SimpleDayDB = {
    ready,

    async clearAll() {
      localStorage.removeItem('simpleDay_journals');
      localStorage.removeItem('simpleDay_focus_logs');
    },

    async getJournal(date) {
      const journals = readJson('simpleDay_journals', {});
      return journals[date] ? { date, ...journals[date] } : null;
    },

    async saveJournal(date, html) {
      const record = { html, updatedAt: Date.now() };
      const journals = readJson('simpleDay_journals', {});
      journals[date] = record;
      writeJson('simpleDay_journals', journals);
      return { date, ...record };
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
      const logs = readJson('simpleDay_focus_logs', []);
      logs.push(record);
      writeJson('simpleDay_focus_logs', logs);
      return record;
    },

    async getFocusLogs() {
      return readJson('simpleDay_focus_logs', []);
    }
  };
})();
