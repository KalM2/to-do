(() => {
  const config = window.SIMPLE_DAY_SUPABASE_CONFIG || {};
  const configured = Boolean(config.url && config.anonKey && window.supabase?.createClient);
  const appPrefixes = ['simpleDay_', 'simpleTracker_'];
  const isAppKey = (key) => appPrefixes.some((prefix) => key.startsWith(prefix));
  const rootUrl = location.pathname.includes('/pages/')
    ? new URL('../', location.href)
    : new URL('./', location.href);
  const routeUrl = (path) => new URL(path, rootUrl).href;
  const loginUrl = routeUrl('pages/login.html');
  const setupUrl = routeUrl('pages/setup.html');
  const homeUrl = routeUrl('index.html');
  const pathname = location.pathname;
  const isLoginPage = pathname.endsWith('/login.html');
  const isSetupPage = pathname.endsWith('/setup.html');
  let syncTimer = null;
  let client = null;
  let user = null;
  let storageSyncInstalled = false;

  const collectWorkspace = () => {
    const workspace = {};
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (key && isAppKey(key)) workspace[key] = localStorage.getItem(key);
    }
    return workspace;
  };

  const clearWorkspaceCache = () => {
    const keys = [];
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (key && isAppKey(key)) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
  };

  const showCloudWarning = (message) => {
    const show = () => {
      if (!document.body || document.querySelector('.cloud-sync-warning')) return;
      const warning = document.createElement('p');
      warning.className = 'cloud-sync-warning';
      warning.setAttribute('role', 'status');
      warning.textContent = message;
      document.body.prepend(warning);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show, { once: true });
    else show();
  };

  const saveWorkspace = async () => {
    if (!client || !user) return;
    const { error } = await client.from('user_workspaces').upsert({
      user_id: user.id,
      data: collectWorkspace(),
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
    if (error) throw error;
  };

  const scheduleSave = () => {
    if (!client || !user) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      saveWorkspace().catch((error) => {
        console.error('Workspace sync failed', error);
        showCloudWarning('Your changes are saved in this browser, but cloud sync failed. Check your connection and database setup.');
      });
    }, 500);
  };

  const installStorageSync = () => {
    if (storageSyncInstalled) return;
    storageSyncInstalled = true;
    const nativeSetItem = Storage.prototype.setItem;
    const nativeRemoveItem = Storage.prototype.removeItem;
    const nativeClear = Storage.prototype.clear;

    Storage.prototype.setItem = function (key, value) {
      nativeSetItem.call(this, key, value);
      if (this === localStorage && isAppKey(String(key))) scheduleSave();
    };
    Storage.prototype.removeItem = function (key) {
      nativeRemoveItem.call(this, key);
      if (this === localStorage && isAppKey(String(key))) scheduleSave();
    };
    Storage.prototype.clear = function () {
      if (this !== localStorage) return nativeClear.call(this);
      clearWorkspaceCache();
      scheduleSave();
    };
  };

  const loadWorkspace = async (importLegacyData) => {
    const { data, error } = await client
      .from('user_workspaces')
      .select('data')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw error;
    if (data?.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
      clearWorkspaceCache();
      Object.entries(data.data).forEach(([key, value]) => {
        if (isAppKey(key) && typeof value === 'string') localStorage.setItem(key, value);
      });
    } else {
      if (!importLegacyData) clearWorkspaceCache();
      await saveWorkspace();
    }
  };

  const displayName = (account) => account?.user_metadata?.display_name?.trim() || '';

  const bootstrap = async () => {
    if (!configured) return { configured: false, authenticated: false };
    client = window.supabase.createClient(config.url, config.anonKey);
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    user = data.session?.user || null;

    if (isLoginPage) {
      if (user) location.replace(displayName(user) ? homeUrl : setupUrl);
      return { configured: true, authenticated: Boolean(user) };
    }
    if (isSetupPage) {
      if (!user) location.replace(loginUrl);
      else if (displayName(user)) location.replace(homeUrl);
      return { configured: true, authenticated: Boolean(user) };
    }
    if (!user) {
      location.replace(loginUrl);
      return { configured: true, authenticated: false };
    }
    if (!displayName(user)) {
      location.replace(setupUrl);
      return { configured: true, authenticated: true, needsSetup: true };
    }

    try {
      const importLegacyData = localStorage.getItem('simpleDayEverAuthenticated') !== 'true';
      await loadWorkspace(importLegacyData);
      localStorage.setItem('simpleDayEverAuthenticated', 'true');
    } catch (workspaceError) {
      console.error('Workspace load failed', workspaceError);
      clearWorkspaceCache();
      showCloudWarning('Could not load your cloud workspace. Check the database setup before adding new data.');
    }
    installStorageSync();
    return { configured: true, authenticated: true };
  };

  const ready = bootstrap().catch((error) => {
    console.error('Authentication bootstrap failed', error);
    if (!isLoginPage && !isSetupPage) location.replace(loginUrl);
    return { configured, authenticated: false, error };
  });

  const completeSetup = async (name) => {
    if (!client || !user) throw new Error('Sign in before setting up your profile.');
    const cleanName = String(name || '').trim();
    if (!cleanName) throw new Error('Enter your name to continue.');
    const { data, error } = await client.auth.updateUser({ data: { display_name: cleanName } });
    if (error) throw error;
    user = data.user || user;
    if (localStorage.getItem('simpleDayEverAuthenticated') === 'true') clearWorkspaceCache();
    const profile = (() => {
      try { return JSON.parse(localStorage.getItem('simpleDay_profile') || '{}'); }
      catch (parseError) { return {}; }
    })();
    profile.name = cleanName;
    profile.email = user.email || '';
    localStorage.setItem('simpleDay_profile', JSON.stringify(profile));
    localStorage.setItem('simpleTracker_userName', cleanName);
    installStorageSync();
    await saveWorkspace();
    localStorage.setItem('simpleDayEverAuthenticated', 'true');
  };

  const signOut = async () => {
    try {
      await saveWorkspace();
    } catch (error) {
      console.error('Final workspace sync failed during sign out', error);
    }
    const { error } = await client.auth.signOut();
    if (error) throw error;
    location.replace(loginUrl);
  };

  window.SimpleDayCloud = {
    get client() { return client; },
    get user() { return user; },
    configured,
    ready,
    saveWorkspace,
    completeSetup,
    signOut
  };

  document.addEventListener('DOMContentLoaded', () => {
    ready.then((state) => {
      if (!state.configured || !state.authenticated || isLoginPage || isSetupPage) return;
      const actions = document.querySelector('.header-actions');
      if (!actions || actions.querySelector('.sign-out-btn')) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'header-btn sign-out-btn';
      button.textContent = 'Sign out';
      button.addEventListener('click', () => {
        button.disabled = true;
        signOut().catch((error) => {
          console.error('Sign out failed', error);
          button.disabled = false;
        });
      });
      actions.appendChild(button);
    });
  });
})();
