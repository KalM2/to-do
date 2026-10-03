// Theme Engine & Account Profile Management for simple day

// Available themes inspired by Omarchy and popular aesthetic palettes
const siteThemes = [
  { id: 'warm-cream', name: 'Warm Cream', bg: '#ffe0b5', panel: '#ffffff', accent: '#f6511d', dark: false },
  { id: 'tokyo-night', name: 'Tokyo Night', bg: '#1a1b26', panel: '#202334', accent: '#7aa2f7', dark: true },
  { id: 'catppuccin', name: 'Catppuccin', bg: '#1e1e2e', panel: '#252538', accent: '#f5c2e7', dark: true },
  { id: 'gruvbox', name: 'Gruvbox', bg: '#282828', panel: '#32302f', accent: '#fe8019', dark: true },
  { id: 'everforest', name: 'Everforest', bg: '#2d353b', panel: '#343f44', accent: '#a7c080', dark: true },
  { id: 'rose-pine', name: 'Rose Pine', bg: '#faf4ed', panel: '#ffffff', accent: '#b4637a', dark: false },
  { id: 'matte-black', name: 'Matte Black', bg: '#121214', panel: '#1a1a1e', accent: '#ff6b4a', dark: true },
  { id: 'nordic-frost', name: 'Nordic Frost', bg: '#eceff4', panel: '#ffffff', accent: '#88c0d0', dark: false },
  { id: 'paper-white', name: 'Paper White', bg: '#ffffff', panel: '#fcfcfc', accent: '#111111', dark: false },
  { id: 'cyberpunk', name: 'Cyberpunk', bg: '#090914', panel: '#101026', accent: '#00f0ff', dark: true }
];

// Helper: Escape HTML
const escapeHtml = (text) => {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
};

// 1. THEME ENGINE
const initThemeEngine = () => {
  let committedTheme = localStorage.getItem('simpleDay_theme') || 'warm-cream';
  document.documentElement.dataset.theme = committedTheme;

  const themeToggleBtn = document.querySelector('.theme-toggle');
  const themeToggleLabel = document.querySelector('.theme-toggle-label');
  const header = document.querySelector('header');

  const updateLabel = (themeId) => {
    const theme = siteThemes.find(t => t.id === themeId) || siteThemes[0];
    if (themeToggleLabel) themeToggleLabel.textContent = theme.name;
    if (themeToggleBtn) themeToggleBtn.setAttribute('aria-label', `Theme: ${theme.name}`);
  };
  updateLabel(committedTheme);

  // Create & Inject Omarchy-style Theme Picker Strip
  let picker = document.querySelector('.theme-picker');
  if (!picker && header) {
    picker = document.createElement('div');
    picker.className = 'theme-picker';
    picker.hidden = true;
    picker.setAttribute('aria-label', 'Choose color theme');

    let itemsHtml = siteThemes.map(theme => `
      <button type="button" class="theme-picker-item ${theme.id === committedTheme ? 'active' : ''}" data-theme-id="${theme.id}" title="${theme.name}">
        <span class="theme-swatch" style="background:${theme.bg};">
          <span class="swatch-panel" style="background:${theme.panel};"></span>
          <span class="swatch-accent" style="background:${theme.accent};"></span>
        </span>
        <span class="theme-name">${theme.name}</span>
        <span class="theme-indicator">✔</span>
      </button>
    `).join('');

    picker.innerHTML = `
      <div class="theme-picker-inner">
        <div class="theme-picker-header">
          <span class="theme-picker-title">Aesthetic Themes</span>
          <span class="theme-picker-hints">← → browse · click to apply · Esc to close</span>
          <button type="button" class="theme-picker-close" aria-label="Close theme menu">✕</button>
        </div>
        <div class="theme-picker-strip">
          ${itemsHtml}
        </div>
      </div>
    `;

    header.after(picker);
  }

  if (!themeToggleBtn || !picker) return;

  const closePickerBtn = picker.querySelector('.theme-picker-close');
  const options = picker.querySelectorAll('.theme-picker-item');

  const openPicker = () => {
    picker.hidden = false;
    themeToggleBtn.classList.add('active');
    const activeItem = picker.querySelector(`.theme-picker-item[data-theme-id="${committedTheme}"]`);
    if (activeItem) activeItem.focus();
  };

  const closePicker = () => {
    picker.hidden = true;
    themeToggleBtn.classList.remove('active');
    // Restore committed theme
    document.documentElement.dataset.theme = committedTheme;
    updateLabel(committedTheme);
  };

  themeToggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (picker.hidden) {
      openPicker();
    } else {
      closePicker();
    }
  });

  if (closePickerBtn) {
    closePickerBtn.addEventListener('click', closePicker);
  }

  // Hover & selection listeners
  options.forEach((btn, idx) => {
    const themeId = btn.dataset.themeId;

    // Live preview on hover
    btn.addEventListener('mouseenter', () => {
      document.documentElement.dataset.theme = themeId;
      updateLabel(themeId);
    });

    btn.addEventListener('mouseleave', () => {
      document.documentElement.dataset.theme = committedTheme;
      updateLabel(committedTheme);
    });

    // Commit on click
    btn.addEventListener('click', () => {
      committedTheme = themeId;
      localStorage.setItem('simpleDay_theme', committedTheme);
      document.documentElement.dataset.theme = committedTheme;
      updateLabel(committedTheme);

      options.forEach(b => b.classList.toggle('active', b.dataset.themeId === committedTheme));
      closePicker();
    });

    // Keyboard navigation
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') {
        const next = options[(idx + 1) % options.length];
        next.focus();
        document.documentElement.dataset.theme = next.dataset.themeId;
        updateLabel(next.dataset.themeId);
      } else if (e.key === 'ArrowLeft') {
        const prev = options[(idx - 1 + options.length) % options.length];
        prev.focus();
        document.documentElement.dataset.theme = prev.dataset.themeId;
        updateLabel(prev.dataset.themeId);
      } else if (e.key === 'Escape') {
        closePicker();
        themeToggleBtn.focus();
      }
    });
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!picker.hidden && !picker.contains(e.target) && !themeToggleBtn.contains(e.target)) {
      closePicker();
    }
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !picker.hidden) {
      closePicker();
    }
  });
};

// 2. PROFILE & ACCOUNT ENGINE
const initProfileEngine = () => {
  const defaultProfile = {
    name: localStorage.getItem('simpleTracker_userName') || 'Kaleb',
    username: '@kaleb',
    email: 'kaleb@simpleday.app',
    bio: 'Focus on what matters most today.',
    avatar: 'K',
    avatarColor: '#0d2c54'
  };

  const getProfile = () => {
    const raw = localStorage.getItem('simpleDay_profile');
    if (raw) {
      try { return { ...defaultProfile, ...JSON.parse(raw) }; } catch (e) { return defaultProfile; }
    }
    return defaultProfile;
  };

  const saveProfile = (p) => {
    localStorage.setItem('simpleDay_profile', JSON.stringify(p));
    localStorage.setItem('simpleTracker_userName', p.name);
  };

  let profile = getProfile();

  // Update Header Elements
  const headerAvatar = document.getElementById('headerProfileAvatar');
  const headerName = document.getElementById('headerProfileName');
  const profileToggleBtn = document.querySelector('.profile-toggle');

  const updateHeaderProfile = () => {
    if (headerAvatar) {
      headerAvatar.textContent = profile.avatar || profile.name.charAt(0).toUpperCase() || 'U';
      headerAvatar.style.backgroundColor = profile.avatarColor || '#0d2c54';
    }
    if (headerName) {
      headerName.textContent = profile.name || 'Account';
    }
    const homeGreetingName = document.getElementById('userName');
    if (homeGreetingName) {
      homeGreetingName.textContent = profile.name;
    }
  };
  updateHeaderProfile();

  // Create Profile Modal if not present
  let profileModal = document.getElementById('profileModal');
  if (!profileModal) {
    profileModal = document.createElement('dialog');
    profileModal.id = 'profileModal';
    profileModal.className = 'app-modal profile-modal';

    profileModal.innerHTML = `
      <form method="dialog" id="profileForm" class="profile-form">
        <div class="profile-header-banner">
          <div class="profile-avatar-large" id="modalProfileAvatar">K</div>
          <div class="profile-banner-info">
            <h3 id="modalProfileNameTitle">Kaleb</h3>
            <span class="profile-badge-tier">✦ Simple Day Member</span>
          </div>
          <button type="button" class="theme-picker-close" id="closeProfileModalTop">✕</button>
        </div>

        <div class="profile-body-sections">
          <!-- Account Details -->
          <div class="profile-section">
            <h4 class="profile-section-title">Account Details</h4>
            <div class="profile-grid-inputs">
              <div class="form-group">
                <label for="profileInputName">Display Name</label>
                <input type="text" id="profileInputName" required />
              </div>
              <div class="form-group">
                <label for="profileInputUsername">Username / Handle</label>
                <input type="text" id="profileInputUsername" />
              </div>
              <div class="form-group">
                <label for="profileInputEmail">Email</label>
                <input type="text" id="profileInputEmail" />
              </div>
              <div class="form-group">
                <label for="profileInputBio">Daily Motto</label>
                <input type="text" id="profileInputBio" />
              </div>
            </div>
          </div>

          <!-- Avatar Customization -->
          <div class="profile-section">
            <h4 class="profile-section-title">Choose Avatar Icon</h4>
            <div class="avatar-choices-row" id="avatarChoicesRow">
              <button type="button" class="avatar-opt-btn active" data-char="K">K</button>
              <button type="button" class="avatar-opt-btn" data-char="☕">☕</button>
              <button type="button" class="avatar-opt-btn" data-char="🚀">🚀</button>
              <button type="button" class="avatar-opt-btn" data-char="🌿">🌿</button>
              <button type="button" class="avatar-opt-btn" data-char="🦊">🦊</button>
              <button type="button" class="avatar-opt-btn" data-char="⚡">⚡</button>
              <button type="button" class="avatar-opt-btn" data-char="🎨">🎨</button>
              <button type="button" class="avatar-opt-btn" data-char="🌊">🌊</button>
            </div>
          </div>

          <!-- Productivity Stats -->
          <div class="profile-section stats-summary-section">
            <h4 class="profile-section-title">Account Productivity Overview</h4>
            <div class="profile-stats-grid">
              <div class="profile-stat-box">
                <span class="p-stat-val" id="profileStatTasks">0</span>
                <span class="p-stat-lbl">Tasks Completed</span>
              </div>
              <div class="profile-stat-box">
                <span class="p-stat-val" id="profileStatHabits">0%</span>
                <span class="p-stat-lbl">Habit Consistency</span>
              </div>
              <div class="profile-stat-box">
                <span class="p-stat-val" id="profileStatProjects">0</span>
                <span class="p-stat-lbl">Active Projects</span>
              </div>
            </div>
          </div>

          <!-- Data Portability -->
          <div class="profile-section data-portability-section">
            <h4 class="profile-section-title">Data Backup & Restore</h4>
            <div class="data-actions-row">
              <button type="button" id="btnExportData" class="btn-secondary">📥 Export Backup (JSON)</button>
              <label for="importDataFile" class="btn-secondary btn-file-label">
                📤 Import Backup
                <input type="file" id="importDataFile" accept=".json" style="display:none;" />
              </label>
              <button type="button" id="btnResetData" class="btn-secondary btn-danger">⚠️ Reset Defaults</button>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button type="button" id="btnCancelProfile" class="btn-secondary">Cancel</button>
          <button type="submit" class="btn-primary">Save Profile</button>
        </div>
      </form>
    `;
    document.body.appendChild(profileModal);
  }

  // Calculate Productivity Stats from localStorage
  const computeStats = () => {
    let completedTasks = 0;
    try {
      const rawTasks = localStorage.getItem('simpleDay_tasks');
      if (rawTasks) {
        const tasks = JSON.parse(rawTasks);
        completedTasks = tasks.filter(t => t.completed).length;
      }
    } catch (e) {}

    let projectsCount = 0;
    try {
      const rawProj = localStorage.getItem('simpleDay_projects_data');
      if (rawProj) {
        projectsCount = JSON.parse(rawProj).length;
      }
    } catch (e) {}

    let habitsConsistency = 0;
    try {
      const rawHabits = localStorage.getItem('simpleDay_habits_data');
      if (rawHabits) {
        const habits = JSON.parse(rawHabits);
        let total = habits.length * 7;
        let done = 0;
        habits.forEach(h => {
          if (h.completions) done += Object.values(h.completions).filter(Boolean).length;
        });
        habitsConsistency = total > 0 ? Math.round((done / total) * 100) : 0;
      }
    } catch (e) {}

    const tasksEl = document.getElementById('profileStatTasks');
    const habitsEl = document.getElementById('profileStatHabits');
    const projEl = document.getElementById('profileStatProjects');
    if (tasksEl) tasksEl.textContent = completedTasks;
    if (habitsEl) habitsEl.textContent = `${habitsConsistency}%`;
    if (projEl) projEl.textContent = projectsCount;
  };

  // Populate Modal Fields
  const openProfileModal = () => {
    profile = getProfile();
    computeStats();

    const nameInput = document.getElementById('profileInputName');
    const usernameInput = document.getElementById('profileInputUsername');
    const emailInput = document.getElementById('profileInputEmail');
    const bioInput = document.getElementById('profileInputBio');
    const modalAvatar = document.getElementById('modalProfileAvatar');
    const modalNameTitle = document.getElementById('modalProfileNameTitle');

    if (nameInput) nameInput.value = profile.name;
    if (usernameInput) usernameInput.value = profile.username;
    if (emailInput) emailInput.value = profile.email;
    if (bioInput) bioInput.value = profile.bio;
    if (modalAvatar) {
      modalAvatar.textContent = profile.avatar;
      modalAvatar.style.backgroundColor = profile.avatarColor;
    }
    if (modalNameTitle) modalNameTitle.textContent = profile.name;

    // Highlight selected avatar
    document.querySelectorAll('.avatar-opt-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.char === profile.avatar);
    });

    profileModal.showModal();
  };

  if (profileToggleBtn) {
    profileToggleBtn.addEventListener('click', openProfileModal);
  }

  // Close buttons
  const closeTop = document.getElementById('closeProfileModalTop');
  const cancelBtn = document.getElementById('btnCancelProfile');
  if (closeTop) closeTop.addEventListener('click', () => profileModal.close());
  if (cancelBtn) cancelBtn.addEventListener('click', () => profileModal.close());

  // Avatar Options
  let selectedAvatar = profile.avatar;
  document.querySelectorAll('.avatar-opt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.avatar-opt-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedAvatar = btn.dataset.char;
      const modalAvatar = document.getElementById('modalProfileAvatar');
      if (modalAvatar) modalAvatar.textContent = selectedAvatar;
    });
  });

  // Save Profile Form Submit
  const profileForm = document.getElementById('profileForm');
  if (profileForm) {
    profileForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('profileInputName').value.trim() || 'Kaleb';
      const username = document.getElementById('profileInputUsername').value.trim() || '@kaleb';
      const email = document.getElementById('profileInputEmail').value.trim() || 'kaleb@simpleday.app';
      const bio = document.getElementById('profileInputBio').value.trim() || '';

      profile = {
        name,
        username,
        email,
        bio,
        avatar: selectedAvatar || name.charAt(0).toUpperCase(),
        avatarColor: profile.avatarColor || '#0d2c54'
      };

      saveProfile(profile);
      updateHeaderProfile();
      profileModal.close();
    });
  }

  // Export Data JSON
  const btnExportData = document.getElementById('btnExportData');
  if (btnExportData) {
    btnExportData.addEventListener('click', () => {
      const backup = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        profile: getProfile(),
        tasks: localStorage.getItem('simpleDay_tasks'),
        plannerPriorities: localStorage.getItem('simpleDay_planner_priorities'),
        calendarEvents: localStorage.getItem('simpleDay_calendar_events'),
        projects: localStorage.getItem('simpleDay_projects_data'),
        kanban: localStorage.getItem('simpleDay_kanban_cards'),
        habits: localStorage.getItem('simpleDay_habits_data'),
        theme: localStorage.getItem('simpleDay_theme')
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `simple-day-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  // Import Data JSON
  const importDataFile = document.getElementById('importDataFile');
  if (importDataFile) {
    importDataFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          if (data.profile) localStorage.setItem('simpleDay_profile', JSON.stringify(data.profile));
          if (data.tasks) localStorage.setItem('simpleDay_tasks', data.tasks);
          if (data.calendarEvents) localStorage.setItem('simpleDay_calendar_events', data.calendarEvents);
          if (data.projects) localStorage.setItem('simpleDay_projects_data', data.projects);
          if (data.kanban) localStorage.setItem('simpleDay_kanban_cards', data.kanban);
          if (data.habits) localStorage.setItem('simpleDay_habits_data', data.habits);
          if (data.theme) localStorage.setItem('simpleDay_theme', data.theme);

          alert('Data successfully imported! The page will now refresh.');
          window.location.reload();
        } catch (err) {
          alert('Failed to parse backup JSON file: ' + err.message);
        }
      };
      reader.readAsText(file);
    });
  }

  // Reset to Defaults
  const btnResetData = document.getElementById('btnResetData');
  if (btnResetData) {
    btnResetData.addEventListener('click', () => {
      if (confirm('Are you sure you want to reset all data and start fresh? This cannot be undone.')) {
        localStorage.clear();
        alert('All data reset. Reloading...');
        window.location.reload();
      }
    });
  }
};

// Initialize both on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initThemeEngine();
  initProfileEngine();
});
