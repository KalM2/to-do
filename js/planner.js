document.addEventListener('DOMContentLoaded', () => {
  let activeDate = new Date();
  let selectedSlotTag = 'Focus';
  let editingBlockId = null;
  let pickingPriorityIndex = null;
  const HOUR_HEIGHT = 56;
  const DAY_START = 6;
  const DAY_END = 22;

  const getDateKey = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getStorageKey = (key) => `simpleDay_planner_${getDateKey(activeDate)}_${key}`;

  const minutesFromTime = (time) => {
    const [h, m] = (time || '09:00').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const timeFromMinutes = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
  };

  const escapeAttr = (text) => String(text || '').replace(/"/g, '&quot;');

  const currentPlannerDateEl = document.getElementById('currentPlannerDate');
  const plannerDateHeaderEl = document.getElementById('plannerDateHeader');
  const prevDayBtn = document.getElementById('prevDayBtn');
  const nextDayBtn = document.getElementById('nextDayBtn');
  const todayPlannerBtn = document.getElementById('todayPlannerBtn');
  const prioritiesListEl = document.getElementById('prioritiesList');
  const scheduleContainerEl = document.getElementById('scheduleContainer');
  const waterTrackerEl = document.getElementById('waterTracker');
  const waterCountEl = document.getElementById('waterCount');
  const dailyNotesEl = document.getElementById('dailyNotes');
  const notesSaveStatusEl = document.getElementById('notesSaveStatus');
  const expandJournalBtn = document.getElementById('expandJournalBtn');
  const journalModal = document.getElementById('journalModal');
  const dailyNotesModal = document.getElementById('dailyNotesModal');
  const notesSaveStatusModal = document.getElementById('notesSaveStatusModal');
  const journalToolbar = document.getElementById('journalToolbar');
  const journalToolbarModal = document.getElementById('journalToolbarModal');
  const closeJournalModalBtn = document.getElementById('closeJournalModalBtn');

  const slotModal = document.getElementById('slotModal');
  const slotForm = document.getElementById('slotForm');
  const modalSlotTimeEl = document.getElementById('modalSlotTime');
  const slotTextInput = document.getElementById('slotTextInput');
  const slotStartInput = document.getElementById('slotStartInput');
  const slotEndInput = document.getElementById('slotEndInput');
  const slotTagsContainer = document.getElementById('slotTags');
  const modalClearBtn = document.getElementById('modalClearBtn');
  const modalCancelBtn = document.getElementById('modalCancelBtn');
  const taskPickerModal = document.getElementById('taskPickerModal');
  const taskPickerList = document.getElementById('taskPickerList');
  const closeTaskPickerBtn = document.getElementById('closeTaskPickerBtn');

  const updateDateDisplay = () => {
    const options = { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' };
    currentPlannerDateEl.textContent = activeDate.toLocaleDateString(undefined, options);
    plannerDateHeaderEl.textContent = activeDate.toLocaleDateString(undefined, {
      weekday: 'short', month: 'long', day: 'numeric'
    });
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

  const loadProjectTasks = () => {
    let projects = [];
    let cards = [];
    try { projects = JSON.parse(localStorage.getItem('simpleDay_projects_data') || '[]'); } catch (e) {}
    try { cards = JSON.parse(localStorage.getItem('simpleDay_kanban_cards') || '[]'); } catch (e) {}
    return { projects, cards };
  };

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
    prioritiesListEl.querySelectorAll('.priority-item').forEach((item) => {
      const cb = item.querySelector('.priority-cb');
      const input = item.querySelector('.priority-input');
      items.push({
        text: input.value,
        completed: cb.checked,
        projectId: item.dataset.projectId || '',
        taskId: item.dataset.taskId || ''
      });
    });
    localStorage.setItem(getStorageKey('priorities'), JSON.stringify(items));
  };

  const renderPriorities = (priorities) => {
    prioritiesListEl.innerHTML = '';
    priorities.forEach((item, index) => {
      const div = document.createElement('div');
      div.className = 'priority-item' + (item.completed ? ' completed' : '');
      div.dataset.projectId = item.projectId || '';
      div.dataset.taskId = item.taskId || '';
      div.innerHTML = `
        <span class="priority-num">${index + 1}</span>
        <input type="checkbox" class="priority-cb" ${item.completed ? 'checked' : ''} aria-label="Mark priority ${index + 1} complete">
        <input type="text" class="priority-input" placeholder="Write a priority, or pick a project task..." value="${escapeAttr(item.text)}">
        <button type="button" class="pill pick-task-btn" title="Choose from a project">From project</button>
      `;
      const cb = div.querySelector('.priority-cb');
      const input = div.querySelector('.priority-input');
      cb.addEventListener('change', () => {
        div.classList.toggle('completed', cb.checked);
        savePriorities();
      });
      input.addEventListener('input', () => {
        div.dataset.taskId = '';
        div.dataset.projectId = '';
        savePriorities();
      });
      div.querySelector('.pick-task-btn').addEventListener('click', () => {
        pickingPriorityIndex = index;
        openTaskPicker();
      });
      prioritiesListEl.appendChild(div);
    });
  };

  const openTaskPicker = () => {
    const { projects, cards } = loadProjectTasks();
    taskPickerList.innerHTML = '';
    if (!projects.length) {
      taskPickerList.innerHTML = `<p class="empty-state">No projects yet. Create one on the Projects page.</p>`;
      taskPickerModal.showModal();
      return;
    }
    projects.forEach((proj) => {
      const group = document.createElement('div');
      group.className = 'task-picker-group';
      const related = cards.filter((c) => (c.projectId === proj.id || c.project === proj.title) && c.column !== 'done');
      group.innerHTML = `<h4>${escapeHtml(proj.title)}</h4>`;
      if (!related.length) {
        group.innerHTML += `<p class="empty-state">No open tasks</p>`;
      } else {
        related.forEach((card) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'task-picker-item';
          btn.textContent = card.title;
          btn.addEventListener('click', () => {
            const rows = prioritiesListEl.querySelectorAll('.priority-item');
            const row = rows[pickingPriorityIndex];
            if (row) {
              row.querySelector('.priority-input').value = card.title;
              row.dataset.projectId = proj.id;
              row.dataset.taskId = card.id;
              savePriorities();
            }
            taskPickerModal.close();
          });
          group.appendChild(btn);
        });
      }
      taskPickerList.appendChild(group);
    });
    taskPickerModal.showModal();
  };

  closeTaskPickerBtn.addEventListener('click', () => taskPickerModal.close());

  const migrateSchedule = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    return Object.keys(raw).map((hour, idx) => {
      const slot = raw[hour];
      const start = Number(hour) * 60;
      return {
        id: 'legacy-' + idx,
        text: slot.text,
        tag: slot.tag || 'Focus',
        start,
        end: start + 60
      };
    });
  };

  const getBlocks = () => {
    const raw = localStorage.getItem(getStorageKey('schedule'));
    if (!raw) return [];
    try { return migrateSchedule(JSON.parse(raw)); } catch (e) { return []; }
  };

  const saveBlocks = (blocks) => {
    localStorage.setItem(getStorageKey('schedule'), JSON.stringify(blocks));
  };

  const loadSchedule = () => {
    const blocks = getBlocks();
    const grid = document.createElement('div');
    grid.className = 'gcal-timed-grid gcal-day-grid planner-day-grid';
    let hoursHtml = '<div class="gcal-hours">';
    for (let h = DAY_START; h < DAY_END; h++) {
      const label = h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;
      hoursHtml += `<div class="gcal-hour-label" style="height:${HOUR_HEIGHT}px">${label}</div>`;
    }
    hoursHtml += '</div>';
    grid.innerHTML = hoursHtml;

    const col = document.createElement('div');
    col.className = 'gcal-day-col';
    col.style.minHeight = `${(DAY_END - DAY_START) * HOUR_HEIGHT}px`;
    let lines = '';
    for (let h = 0; h < (DAY_END - DAY_START); h++) {
      lines += `<div class="gcal-hour-line" style="top:${h * HOUR_HEIGHT}px"></div>`;
    }
    col.innerHTML = lines;

    blocks.forEach((block) => {
      const top = ((block.start - DAY_START * 60) / 60) * HOUR_HEIGHT;
      const height = Math.max(22, ((block.end - block.start) / 60) * HOUR_HEIGHT);
      const ev = document.createElement('button');
      ev.type = 'button';
      ev.className = `gcal-event tag-${(block.tag || 'focus').toLowerCase()}`;
      ev.style.cssText = `top:${top}px;height:${height}px;`;
      ev.innerHTML = `<strong>${escapeHtml(block.text)}</strong><span>${timeFromMinutes(block.start)} – ${timeFromMinutes(block.end)}</span>`;
      ev.addEventListener('click', (e) => {
        e.stopPropagation();
        openSlotModal(block);
      });
      col.appendChild(ev);
    });

    col.addEventListener('click', (e) => {
      const mins = DAY_START * 60 + Math.round((e.offsetY / HOUR_HEIGHT) * 60 / 15) * 15;
      openSlotModal({
        id: null,
        text: '',
        tag: 'Focus',
        start: mins,
        end: mins + 45
      });
    });

    grid.appendChild(col);
    scheduleContainerEl.innerHTML = '';
    scheduleContainerEl.appendChild(grid);
    updatePlannerCurrentTimeLine();
  };

  const updatePlannerCurrentTimeLine = () => {
    const column = scheduleContainerEl.querySelector('.gcal-day-col');
    if (!column) return;
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    let line = column.querySelector('.planner-current-time-line');
    if (getDateKey(activeDate) !== getDateKey(now) || minutes < DAY_START * 60 || minutes >= DAY_END * 60) {
      line?.remove();
      return;
    }
    if (!line) {
      line = document.createElement('div');
      line.className = 'gcal-current-time-line planner-current-time-line';
      line.setAttribute('aria-hidden', 'true');
      column.appendChild(line);
    }
    line.style.top = `${((minutes - DAY_START * 60) / 60) * HOUR_HEIGHT}px`;
  };

  window.setInterval(updatePlannerCurrentTimeLine, 60 * 1000);

  const openSlotModal = (block) => {
    editingBlockId = block.id;
    modalSlotTimeEl.textContent = block.id ? 'Edit block' : 'New time block';
    slotTextInput.value = block.text || '';
    slotStartInput.value = timeFromMinutes(block.start);
    slotEndInput.value = timeFromMinutes(block.end);
    selectedSlotTag = block.tag || 'Focus';
    slotTagsContainer.querySelectorAll('.pill').forEach((pill) => {
      pill.classList.toggle('selected', pill.dataset.tag === selectedSlotTag);
    });
    slotModal.showModal();
    slotTextInput.focus();
  };

  slotTagsContainer.querySelectorAll('.pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      slotTagsContainer.querySelectorAll('.pill').forEach((p) => p.classList.remove('selected'));
      pill.classList.add('selected');
      selectedSlotTag = pill.dataset.tag;
    });
  });

  slotForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = slotTextInput.value.trim();
    if (!text) return;
    const start = minutesFromTime(slotStartInput.value);
    let end = minutesFromTime(slotEndInput.value);
    if (end <= start) end = start + 30;
    const blocks = getBlocks();
    if (editingBlockId) {
      const existing = blocks.find((b) => b.id === editingBlockId);
      if (existing) {
        existing.text = text;
        existing.tag = selectedSlotTag;
        existing.start = start;
        existing.end = end;
      }
    } else {
      blocks.push({
        id: 'blk-' + Date.now(),
        text,
        tag: selectedSlotTag,
        start,
        end
      });
    }
    saveBlocks(blocks);
    slotModal.close();
    loadSchedule();
  });

  modalClearBtn.addEventListener('click', () => {
    if (editingBlockId) {
      saveBlocks(getBlocks().filter((b) => b.id !== editingBlockId));
    }
    slotModal.close();
    loadSchedule();
  });

  modalCancelBtn.addEventListener('click', () => slotModal.close());

  const loadWater = () => {
    const count = parseInt(localStorage.getItem(getStorageKey('water')), 10) || 0;
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
      glass.textContent = '💧';
      glass.addEventListener('click', () => {
        const newCount = (i === count) ? i - 1 : i;
        localStorage.setItem(getStorageKey('water'), newCount);
        renderWater(newCount);
      });
      waterTrackerEl.appendChild(glass);
    }
  };

  let notesTimeout = null;
  const setNotesStatus = (text) => {
    notesSaveStatusEl.textContent = text;
    if (notesSaveStatusModal) notesSaveStatusModal.textContent = text;
  };

  const loadNotes = async () => {
    const key = getDateKey(activeDate);
    let html = '';
    if (window.SimpleDayDB) {
      const rec = await SimpleDayDB.getJournal(key);
      html = rec?.html || '';
    }
    if (!html) html = localStorage.getItem(getStorageKey('notes')) || '';
    dailyNotesEl.innerHTML = html;
    if (dailyNotesModal) dailyNotesModal.innerHTML = html;
    setNotesStatus('Saved locally');
  };

  const persistNotes = async (html) => {
    const key = getDateKey(activeDate);
    localStorage.setItem(getStorageKey('notes'), html);
    if (window.SimpleDayDB) await SimpleDayDB.saveJournal(key, html);
    setNotesStatus('Saved locally');
  };

  const bindEditor = (editor) => {
    editor.addEventListener('input', () => {
      setNotesStatus('Saving...');
      const html = editor.innerHTML;
      if (editor !== dailyNotesEl) dailyNotesEl.innerHTML = html;
      if (dailyNotesModal && editor !== dailyNotesModal) dailyNotesModal.innerHTML = html;
      clearTimeout(notesTimeout);
      notesTimeout = setTimeout(() => persistNotes(html), 400);
    });
    editor.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        document.execCommand('insertText', false, '  ');
      }
    });
  };

  bindEditor(dailyNotesEl);
  if (dailyNotesModal) bindEditor(dailyNotesModal);

  const wireToolbar = (toolbar) => {
    if (!toolbar) return;
    toolbar.querySelectorAll('button[data-cmd]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cmd = btn.dataset.cmd;
        const value = btn.dataset.value || null;
        const target = journalModal.open ? dailyNotesModal : dailyNotesEl;
        target.focus();
        if (cmd === 'formatBlock') document.execCommand('formatBlock', false, value);
        else document.execCommand(cmd, false, value);
        target.dispatchEvent(new Event('input'));
      });
    });
  };

  journalToolbarModal.innerHTML = journalToolbar.innerHTML;
  wireToolbar(journalToolbar);
  wireToolbar(journalToolbarModal);

  expandJournalBtn.addEventListener('click', () => {
    dailyNotesModal.innerHTML = dailyNotesEl.innerHTML;
    journalModal.showModal();
    dailyNotesModal.focus();
  });
  closeJournalModalBtn.addEventListener('click', () => journalModal.close());

  updateDateDisplay();
});
