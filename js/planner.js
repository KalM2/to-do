// Planner Logic & Persistence
document.addEventListener('DOMContentLoaded', () => {
  // State
  let activeDate = new Date();
  let selectedModalHour = null;
  let selectedSlotTag = 'Focus';

  // Format YYYY-MM-DD
  const getDateKey = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getStorageKey = (key) => `simpleDay_planner_${getDateKey(activeDate)}_${key}`;

  // DOM Elements
  const currentPlannerDateEl = document.getElementById('currentPlannerDate');
  const prevDayBtn = document.getElementById('prevDayBtn');
  const nextDayBtn = document.getElementById('nextDayBtn');
  const todayPlannerBtn = document.getElementById('todayPlannerBtn');
  const prioritiesListEl = document.getElementById('prioritiesList');
  const scheduleContainerEl = document.getElementById('scheduleContainer');
  const waterTrackerEl = document.getElementById('waterTracker');
  const waterCountEl = document.getElementById('waterCount');
  const dailyNotesEl = document.getElementById('dailyNotes');
  const notesSaveStatusEl = document.getElementById('notesSaveStatus');

  // Modal elements
  const slotModal = document.getElementById('slotModal');
  const slotForm = document.getElementById('slotForm');
  const modalSlotTimeEl = document.getElementById('modalSlotTime');
  const slotTextInput = document.getElementById('slotTextInput');
  const slotTagsContainer = document.getElementById('slotTags');
  const modalClearBtn = document.getElementById('modalClearBtn');
  const modalCancelBtn = document.getElementById('modalCancelBtn');

  // 1. Date Header & Navigation
  const updateDateDisplay = () => {
    const options = { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' };
    currentPlannerDateEl.textContent = activeDate.toLocaleDateString(undefined, options);

    // Refresh all data for active date
    loadPriorities();
    loadSchedule();
    loadWater();
    loadNotes();
  };

  prevDayBtn.addEventListener('click', () => {
    activeDate.setDate(activeDate.getDate() - 1);
    updateDateDisplay();
  });

  nextDayBtn.addEventListener('click', () => {
    activeDate.setDate(activeDate.getDate() + 1);
    updateDateDisplay();
  });

  todayPlannerBtn.addEventListener('click', () => {
    activeDate = new Date();
    updateDateDisplay();
  });

  // 2. Top 3 Priorities
  const loadPriorities = () => {
    const raw = localStorage.getItem(getStorageKey('priorities'));
    let priorities = [];
    if (raw) {
      try { priorities = JSON.parse(raw); } catch (e) { priorities = []; }
    }
    if (!priorities || priorities.length === 0) {
      priorities = [
        { text: '', completed: false },
        { text: '', completed: false },
        { text: '', completed: false }
      ];
    }
    renderPriorities(priorities);
  };

  const savePriorities = () => {
    const items = [];
    prioritiesListEl.querySelectorAll('.priority-item').forEach(item => {
      const cb = item.querySelector('.priority-cb');
      const input = item.querySelector('.priority-input');
      items.push({
        text: input.value.trim(),
        completed: cb.checked
      });
    });
    localStorage.setItem(getStorageKey('priorities'), JSON.stringify(items));
  };

  const renderPriorities = (priorities) => {
    prioritiesListEl.innerHTML = '';
    priorities.forEach((item, index) => {
      const div = document.createElement('div');
      div.className = 'priority-item' + (item.completed ? ' completed' : '');
      div.innerHTML = `
        <span class="priority-num">${index + 1}</span>
        <input type="checkbox" class="priority-cb" ${item.completed ? 'checked' : ''} aria-label="Mark priority ${index + 1} complete">
        <input type="text" class="priority-input" placeholder="Primary goal #${index + 1} for today..." value="${item.text}">
      `;

      const cb = div.querySelector('.priority-cb');
      const input = div.querySelector('.priority-input');

      cb.addEventListener('change', () => {
        div.classList.toggle('completed', cb.checked);
        savePriorities();
      });

      input.addEventListener('input', () => {
        savePriorities();
      });

      prioritiesListEl.appendChild(div);
    });
  };

  // 3. Hourly Time Blocking Schedule (06:00 to 22:00)
  const hours = [
    { hour: 6, label: '06:00 AM' },
    { hour: 7, label: '07:00 AM' },
    { hour: 8, label: '08:00 AM' },
    { hour: 9, label: '09:00 AM' },
    { hour: 10, label: '10:00 AM' },
    { hour: 11, label: '11:00 AM' },
    { hour: 12, label: '12:00 PM' },
    { hour: 13, label: '01:00 PM' },
    { hour: 14, label: '02:00 PM' },
    { hour: 15, label: '03:00 PM' },
    { hour: 16, label: '04:00 PM' },
    { hour: 17, label: '05:00 PM' },
    { hour: 18, label: '06:00 PM' },
    { hour: 19, label: '07:00 PM' },
    { hour: 20, label: '08:00 PM' },
    { hour: 21, label: '09:00 PM' },
    { hour: 22, label: '10:00 PM' }
  ];

  const getScheduleData = () => {
    const raw = localStorage.getItem(getStorageKey('schedule'));
    if (!raw) return {};
    try { return JSON.parse(raw); } catch (e) { return {}; }
  };

  const saveScheduleData = (data) => {
    localStorage.setItem(getStorageKey('schedule'), JSON.stringify(data));
  };

  const loadSchedule = () => {
    const data = getScheduleData();
    scheduleContainerEl.innerHTML = '';

    hours.forEach(({ hour, label }) => {
      const slotData = data[hour] || null;
      const row = document.createElement('div');
      row.className = 'schedule-row';
      row.dataset.hour = hour;

      const hasEvent = slotData && slotData.text;
      const tagClass = hasEvent ? `tag-${slotData.tag.toLowerCase()}` : '';

      row.innerHTML = `
        <div class="schedule-time">${label}</div>
        <div class="schedule-slot ${hasEvent ? 'has-event ' + tagClass : 'empty-slot'}">
          ${hasEvent ? `
            <span class="slot-text">${slotData.text}</span>
            <span class="slot-badge">${slotData.tag}</span>
          ` : `<span class="slot-placeholder">+ Add block</span>`}
        </div>
      `;

      row.querySelector('.schedule-slot').addEventListener('click', () => {
        openSlotModal(hour, label, slotData);
      });

      scheduleContainerEl.appendChild(row);
    });
  };

  const openSlotModal = (hour, label, currentData) => {
    selectedModalHour = hour;
    modalSlotTimeEl.textContent = `Schedule: ${label}`;
    slotTextInput.value = currentData?.text || '';
    selectedSlotTag = currentData?.tag || 'Focus';

    slotTagsContainer.querySelectorAll('.pill').forEach(pill => {
      pill.classList.toggle('selected', pill.dataset.tag === selectedSlotTag);
    });

    slotModal.showModal();
    slotTextInput.focus();
  };

  slotTagsContainer.querySelectorAll('.pill').forEach(pill => {
    pill.addEventListener('click', () => {
      slotTagsContainer.querySelectorAll('.pill').forEach(p => p.classList.remove('selected'));
      pill.classList.add('selected');
      selectedSlotTag = pill.dataset.tag;
    });
  });

  slotForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = slotTextInput.value.trim();
    if (!text || selectedModalHour === null) return;

    const data = getScheduleData();
    data[selectedModalHour] = { text, tag: selectedSlotTag };
    saveScheduleData(data);
    slotModal.close();
    loadSchedule();
  });

  modalClearBtn.addEventListener('click', () => {
    if (selectedModalHour === null) return;
    const data = getScheduleData();
    delete data[selectedModalHour];
    saveScheduleData(data);
    slotModal.close();
    loadSchedule();
  });

  modalCancelBtn.addEventListener('click', () => {
    slotModal.close();
  });

  // 4. Hydration Tracker
  const loadWater = () => {
    const raw = localStorage.getItem(getStorageKey('water'));
    const count = parseInt(raw, 10) || 0;
    renderWater(count);
  };

  const renderWater = (count) => {
    waterTrackerEl.innerHTML = '';
    waterCountEl.textContent = count;

    for (let i = 1; i <= 8; i++) {
      const glass = document.createElement('button');
      glass.type = 'button';
      glass.className = 'water-glass' + (i <= count ? ' filled' : '');
      glass.title = `Glass ${i}`;
      glass.innerHTML = `💧`;
      glass.addEventListener('click', () => {
        const newCount = (i === count) ? i - 1 : i;
        localStorage.setItem(getStorageKey('water'), newCount);
        renderWater(newCount);
      });
      waterTrackerEl.appendChild(glass);
    }
  };

  // 5. Daily Notes / Scratchpad
  let notesTimeout = null;
  const loadNotes = () => {
    const notes = localStorage.getItem(getStorageKey('notes')) || '';
    dailyNotesEl.value = notes;
    notesSaveStatusEl.textContent = 'Saved';
  };

  dailyNotesEl.addEventListener('input', () => {
    notesSaveStatusEl.textContent = 'Saving...';
    clearTimeout(notesTimeout);
    notesTimeout = setTimeout(() => {
      localStorage.setItem(getStorageKey('notes'), dailyNotesEl.value);
      notesSaveStatusEl.textContent = 'Saved';
    }, 400);
  });

  // 6. Pomodoro Focus Timer
  let timerDuration = 1500; // 25 min default
  let timerRemaining = 1500;
  let timerInterval = null;
  let isTimerRunning = false;

  const timerDisplayEl = document.getElementById('timerDisplay');
  const timerStartBtn = document.getElementById('timerStartBtn');
  const timerResetBtn = document.getElementById('timerResetBtn');
  const timerModeBtns = document.querySelectorAll('.timer-mode');
  const sessionCountText = document.getElementById('sessionCountText');

  const getSessionsKey = () => `simpleDay_planner_${getDateKey(new Date())}_sessions`;

  const updateSessionsDisplay = () => {
    const sessions = parseInt(localStorage.getItem(getSessionsKey()), 10) || 0;
    sessionCountText.textContent = sessions;
  };
  updateSessionsDisplay();

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const updateTimerDisplay = () => {
    timerDisplayEl.textContent = formatTimer(timerRemaining);
  };

  const playChime = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.3); // A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.8);
    } catch (e) {
      console.log('Audio chime not supported');
    }
  };

  timerModeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      timerModeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      timerDuration = parseInt(btn.dataset.time, 10);
      pauseTimer();
      timerRemaining = timerDuration;
      updateTimerDisplay();
    });
  });

  const startTimer = () => {
    if (isTimerRunning) return;
    isTimerRunning = true;
    timerStartBtn.textContent = 'Pause';
    timerStartBtn.classList.add('running');

    timerInterval = setInterval(() => {
      timerRemaining--;
      updateTimerDisplay();

      if (timerRemaining <= 0) {
        clearInterval(timerInterval);
        isTimerRunning = false;
        timerStartBtn.textContent = 'Start';
        timerStartBtn.classList.remove('running');
        playChime();

        // Increment sessions count if in focus mode (1500s)
        if (timerDuration === 1500) {
          const sessions = (parseInt(localStorage.getItem(getSessionsKey()), 10) || 0) + 1;
          localStorage.setItem(getSessionsKey(), sessions);
          updateSessionsDisplay();
        }

        timerRemaining = timerDuration;
        updateTimerDisplay();
        alert('Timer completed! Take a breath or switch to break mode.');
      }
    }, 1000);
  };

  const pauseTimer = () => {
    if (!isTimerRunning) return;
    isTimerRunning = false;
    clearInterval(timerInterval);
    timerStartBtn.textContent = 'Start';
    timerStartBtn.classList.remove('running');
  };

  timerStartBtn.addEventListener('click', () => {
    if (isTimerRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  });

  timerResetBtn.addEventListener('click', () => {
    pauseTimer();
    timerRemaining = timerDuration;
    updateTimerDisplay();
  });

  // Initial render
  updateDateDisplay();
  updateTimerDisplay();
});
