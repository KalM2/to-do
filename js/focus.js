document.addEventListener('DOMContentLoaded', () => {
  const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
  };

  const todayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const formatDuration = (seconds) => {
    const s = Math.max(0, Math.round(seconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const rem = s % 60;
    if (h) return `${h}h ${m}m`;
    if (m) return `${m}m ${rem}s`;
    return `${rem}s`;
  };

  const loadProjects = () => {
    try { return JSON.parse(localStorage.getItem('simpleDay_projects_data') || '[]'); } catch (e) { return []; }
  };
  const loadCards = () => {
    try { return JSON.parse(localStorage.getItem('simpleDay_kanban_cards') || '[]'); } catch (e) { return []; }
  };
  const saveCards = (cards) => localStorage.setItem('simpleDay_kanban_cards', JSON.stringify(cards));

  const projectSelect = document.getElementById('focusProjectSelect');
  const taskSelect = document.getElementById('focusTaskSelect');
  const focusTargetSummary = document.getElementById('focusTargetSummary');
  const timerDisplayEl = document.getElementById('timerDisplay');
  const timerStartBtn = document.getElementById('timerStartBtn');
  const timerResetBtn = document.getElementById('timerResetBtn');
  const timerModeBtns = document.querySelectorAll('.timer-mode');
  const sessionCountText = document.getElementById('sessionCountText');
  const focusTotals = document.getElementById('focusTotals');
  const focusLogList = document.getElementById('focusLogList');

  let projects = loadProjects();
  let cards = loadCards();
  let timerDuration = 1500;
  let timerRemaining = 1500;
  let timerInterval = null;
  let isTimerRunning = false;
  let sessionElapsed = 0;
  let activeMode = 'focus';

  const selectedProject = () => projects.find((p) => p.id === projectSelect.value) || null;
  const selectedTask = () => cards.find((c) => c.id === taskSelect.value) || null;

  const getSessionsKey = () => `simpleDay_planner_${todayKey()}_sessions`;

  const populateProjects = () => {
    projectSelect.innerHTML = '<option value="">Select a project</option>';
    projects.forEach((p) => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.title;
      projectSelect.appendChild(opt);
    });
  };

  const populateTasks = () => {
    const proj = selectedProject();
    taskSelect.innerHTML = '<option value="">Whole project</option>';
    if (!proj) return;
    cards
      .filter((c) => c.projectId === proj.id || c.project === proj.title)
      .forEach((c) => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.title}${c.column === 'done' ? ' (done)' : ''}`;
        taskSelect.appendChild(opt);
      });
  };

  const updateTargetSummary = () => {
    const proj = selectedProject();
    const task = selectedTask();
    if (!proj) {
      focusTargetSummary.textContent = 'Choose a project to start tracking.';
      return;
    }
    const related = cards.filter((c) => c.projectId === proj.id || c.project === proj.title);
    const total = related.reduce((sum, c) => sum + (c.focusSeconds || 0), 0);
    if (task) {
      focusTargetSummary.textContent = `${task.title} · ${formatDuration(task.focusSeconds || 0)} on this task · ${formatDuration(total)} on ${proj.title}`;
    } else {
      focusTargetSummary.textContent = `${proj.title} · ${formatDuration(total)} focused so far`;
    }
  };

  const addSecondsToSelection = (seconds) => {
    if (seconds < 1) return;
    const proj = selectedProject();
    const task = selectedTask();
    if (task) {
      task.focusSeconds = (task.focusSeconds || 0) + seconds;
      saveCards(cards);
    } else if (proj) {
      const bucket = cards.find((c) => (c.projectId === proj.id || c.project === proj.title) && c.id === `${proj.id}-unspecified`);
      if (bucket) {
        bucket.focusSeconds = (bucket.focusSeconds || 0) + seconds;
      } else {
        cards.push({
          id: `${proj.id}-unspecified`,
          title: 'General focus',
          column: 'in-progress',
          project: proj.title,
          projectId: proj.id,
          priority: 'Medium',
          eisenhower: 'i',
          focusSeconds: seconds
        });
      }
      saveCards(cards);
    }
  };

  const renderLogs = async () => {
    const logs = window.SimpleDayDB ? await SimpleDayDB.getFocusLogs() : [];
    const todayLogs = logs.filter((l) => l.date === todayKey()).sort((a, b) => b.endedAt - a.endedAt);
    const byProject = {};
    logs.forEach((l) => {
      const key = l.projectTitle || 'Untargeted';
      byProject[key] = (byProject[key] || 0) + (l.seconds || 0);
    });
    focusTotals.innerHTML = Object.keys(byProject).length
      ? Object.entries(byProject).map(([name, secs]) => `<div class="focus-total-row"><span>${escapeHtml(name)}</span><strong>${escapeHtml(formatDuration(secs))}</strong></div>`).join('')
      : '<p class="empty-state">No focus time logged yet.</p>';
    focusLogList.innerHTML = todayLogs.length
      ? todayLogs.map((l) => `<div class="focus-log-row"><span>${escapeHtml(l.taskTitle || l.projectTitle || 'Session')}</span><strong>${escapeHtml(formatDuration(l.seconds))}</strong></div>`).join('')
      : '<p class="empty-state">Nothing logged today.</p>';
    sessionCountText.textContent = parseInt(localStorage.getItem(getSessionsKey()), 10) || 0;
  };

  const commitElapsed = async () => {
    if (activeMode !== 'focus' || sessionElapsed < 1) {
      sessionElapsed = 0;
      return;
    }
    const seconds = sessionElapsed;
    sessionElapsed = 0;
    const proj = selectedProject();
    const task = selectedTask();
    addSecondsToSelection(seconds);
    if (window.SimpleDayDB) {
      await SimpleDayDB.addFocusLog({
        date: todayKey(),
        projectId: proj?.id || '',
        projectTitle: proj?.title || '',
        taskId: task?.id || '',
        taskTitle: task?.title || (proj ? 'General focus' : 'Untargeted session'),
        seconds,
        mode: 'focus'
      });
    }
    updateTargetSummary();
    renderLogs();
  };

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const playChime = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.8);
    } catch (e) {}
  };

  const pauseTimer = async () => {
    if (!isTimerRunning) return;
    isTimerRunning = false;
    clearInterval(timerInterval);
    timerStartBtn.textContent = 'Start';
    timerStartBtn.classList.remove('running');
    await commitElapsed();
  };

  const startTimer = () => {
    if (isTimerRunning) return;
    isTimerRunning = true;
    timerStartBtn.textContent = 'Pause';
    timerStartBtn.classList.add('running');
    timerInterval = setInterval(async () => {
      timerRemaining--;
      if (activeMode === 'focus') sessionElapsed++;
      timerDisplayEl.textContent = formatTimer(timerRemaining);
      if (timerRemaining <= 0) {
        clearInterval(timerInterval);
        isTimerRunning = false;
        timerStartBtn.textContent = 'Start';
        timerStartBtn.classList.remove('running');
        playChime();
        await commitElapsed();
        if (timerDuration === 1500) {
          const sessions = (parseInt(localStorage.getItem(getSessionsKey()), 10) || 0) + 1;
          localStorage.setItem(getSessionsKey(), sessions);
        }
        timerRemaining = timerDuration;
        timerDisplayEl.textContent = formatTimer(timerRemaining);
        renderLogs();
      }
    }, 1000);
  };

  timerModeBtns.forEach((btn) => {
    btn.addEventListener('click', async () => {
      await pauseTimer();
      timerModeBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      timerDuration = parseInt(btn.dataset.time, 10);
      activeMode = timerDuration === 1500 ? 'focus' : 'break';
      timerRemaining = timerDuration;
      timerDisplayEl.textContent = formatTimer(timerRemaining);
    });
  });

  timerStartBtn.addEventListener('click', async () => {
    if (isTimerRunning) await pauseTimer();
    else startTimer();
  });

  timerResetBtn.addEventListener('click', async () => {
    await pauseTimer();
    timerRemaining = timerDuration;
    timerDisplayEl.textContent = formatTimer(timerRemaining);
  });

  projectSelect.addEventListener('change', () => {
    populateTasks();
    updateTargetSummary();
  });
  taskSelect.addEventListener('change', updateTargetSummary);

  window.addEventListener('beforeunload', () => {
    if (isTimerRunning && sessionElapsed > 0) {
      const seconds = sessionElapsed;
      const proj = selectedProject();
      const task = selectedTask();
      addSecondsToSelection(seconds);
      try {
        const logs = JSON.parse(localStorage.getItem('simpleDay_focus_logs') || '[]');
        logs.push({
          id: 'focus-unload-' + Date.now(),
          date: todayKey(),
          projectId: proj?.id || '',
          projectTitle: proj?.title || '',
          taskId: task?.id || '',
          taskTitle: task?.title || '',
          seconds,
          mode: 'focus',
          endedAt: Date.now()
        });
        localStorage.setItem('simpleDay_focus_logs', JSON.stringify(logs));
      } catch (e) {}
    }
  });

  populateProjects();
  populateTasks();
  updateTargetSummary();
  timerDisplayEl.textContent = formatTimer(timerRemaining);
  renderLogs();
});
