// Habits Tracker Logic & Streak Engine
document.addEventListener('DOMContentLoaded', async () => {
  await window.SimpleDayCloud.ready;
  if (window.SimpleDayCloud.configured && !window.SimpleDayCloud.user) return;
  await window.SimpleDayDB.ready;
  // SVGs
  const deleteSVG = `<svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg>`;
  const editSVG = `<svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px"><path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56ZM620-570l-28-29 57 57-29-28Z"/></svg>`;

  // Helper: Escape HTML
  const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  const toDateKey = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // State
  let activeWeekDate = new Date(); // Any date in the target week
  let selectedHabitTime = 'Morning';
  let draggedHabitId = null;
  let editingHabitId = null;
  const habitSortModeKey = 'simpleDay_habits_sort_mode';
  let habitSortMode = localStorage.getItem(habitSortModeKey) === 'custom' ? 'custom' : 'time';

  // DOM Elements
  const currentWeekRangeEl = document.getElementById('currentWeekRange');
  const prevWeekBtn = document.getElementById('prevWeekBtn');
  const nextWeekBtn = document.getElementById('nextWeekBtn');
  const currentWeekBtn = document.getElementById('currentWeekBtn');
  const habitsDaysHeaderRow = document.getElementById('habitsDaysHeaderRow');
  const habitsTableBody = document.getElementById('habitsTableBody');
  const metricConsistency = document.getElementById('metricConsistency');
  const metricProgressBar = document.getElementById('metricProgressBar');
  const metricActiveCount = document.getElementById('metricActiveCount');
  const metricLongestStreak = document.getElementById('metricLongestStreak');
  const sortHabitsByTimeBtn = document.getElementById('sortHabitsByTimeBtn');
  const sortHabitsCustomBtn = document.getElementById('sortHabitsCustomBtn');

  // Modal Elements
  const openAddHabitBtn = document.getElementById('openAddHabitBtn');
  const newHabitModal = document.getElementById('newHabitModal');
  const newHabitForm = document.getElementById('newHabitForm');
  const habitNameInput = document.getElementById('habitNameInput');
  const habitTimePills = document.getElementById('habitTimePills') || document.getElementById('habitCategoryPills');
  const habitTargetSelect = document.getElementById('habitTargetSelect');
  const habitModalTitle = document.getElementById('habitModalTitle');
  const saveHabitBtn = document.getElementById('saveHabitBtn');
  const closeHabitModalBtn = document.getElementById('closeHabitModalBtn');

  const getTimeOfDay = (habit) => {
    const value = habit.timeOfDay || habit.time || habit.category || '';
    const time = String(value).toLowerCase();
    if (time === 'morning' || time === 'mind') return 'Morning';
    if (time === 'afternoon') return 'Afternoon';
    if (time === 'evening' || time === 'night' || time === 'fitness' || time === 'productivity') return 'Evening';
    return 'Anytime';
  };

  const getSortedHabits = () => {
    if (habitSortMode === 'custom') return habits;
    const timeOrder = { Morning: 0, Afternoon: 1, Evening: 2, Anytime: 3 };
    return habits
      .map((habit, index) => ({ habit, index }))
      .sort((a, b) => timeOrder[getTimeOfDay(a.habit)] - timeOrder[getTimeOfDay(b.habit)] || a.index - b.index)
      .map(({ habit }) => habit);
  };

  const updateSortControls = () => {
    const timeSelected = habitSortMode === 'time';
    sortHabitsByTimeBtn.classList.toggle('selected', timeSelected);
    sortHabitsByTimeBtn.setAttribute('aria-pressed', String(timeSelected));
    sortHabitsCustomBtn.classList.toggle('selected', !timeSelected);
    sortHabitsCustomBtn.setAttribute('aria-pressed', String(!timeSelected));
  };

  // Compute Monday through Sunday for active week
  const getWeekDates = (baseDate) => {
    const d = new Date(baseDate);
    const day = d.getDay(); // 0 is Sun, 1 is Mon...
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    d.setDate(d.getDate() + diffToMonday);

    const week = [];
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(d);
      dayDate.setDate(d.getDate() + i);
      week.push(dayDate);
    }
    return week;
  };

  // Load Data
  const loadHabits = () => {
    const raw = localStorage.getItem('simpleDay_habits_data');
    if (raw !== null) {
      SimpleDayDefaults.markInitialized('habits');
      try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        const normalized = parsed.map(habit => {
          if (!habit || typeof habit !== 'object') return habit;
          const timeOfDay = getTimeOfDay(habit);
          return habit.timeOfDay === timeOfDay ? habit : { ...habit, timeOfDay };
        });
        if (normalized.some((habit, index) => habit !== parsed[index])) {
          localStorage.setItem('simpleDay_habits_data', JSON.stringify(normalized));
        }
        return normalized;
      } catch (e) { return []; }
    }
    if (!SimpleDayDefaults.shouldSeed('habits')) return [];

    const today = new Date();
    const dMinus1 = new Date(today); dMinus1.setDate(today.getDate() - 1);
    const dMinus2 = new Date(today); dMinus2.setDate(today.getDate() - 2);
    const dMinus3 = new Date(today); dMinus3.setDate(today.getDate() - 3);

    const defaultHabits = [
      {
        id: 'h-1',
        name: 'Morning Mindfulness & Meditation',
        timeOfDay: 'Morning',
        target: 'Daily',
        completions: {
          [toDateKey(today)]: true,
          [toDateKey(dMinus1)]: true,
          [toDateKey(dMinus2)]: true,
          [toDateKey(dMinus3)]: true
        }
      },
      {
        id: 'h-2',
        name: 'Hydration Target (2.5L Water)',
        timeOfDay: 'Anytime',
        target: 'Daily',
        completions: {
          [toDateKey(today)]: true,
          [toDateKey(dMinus1)]: true,
          [toDateKey(dMinus2)]: true
        }
      },
      {
        id: 'h-3',
        name: 'Daily 30m Workout or Walk',
        timeOfDay: 'Evening',
        target: '5x / week',
        completions: {
          [toDateKey(dMinus1)]: true,
          [toDateKey(dMinus2)]: true
        }
      },
      {
        id: 'h-4',
        name: 'Evening Reading (20 pages)',
        timeOfDay: 'Evening',
        target: 'Daily',
        completions: {
          [toDateKey(today)]: true,
          [toDateKey(dMinus1)]: true
        }
      }
    ];
    localStorage.setItem('simpleDay_habits_data', JSON.stringify(defaultHabits));
    SimpleDayDefaults.markInitialized('habits');
    return defaultHabits;
  };

  const saveHabits = (data) => {
    localStorage.setItem('simpleDay_habits_data', JSON.stringify(data));
  };

  let habits = loadHabits();

  // Calculate Habit Streak
  const calculateStreak = (completions) => {
    if (!completions) return 0;
    let streak = 0;
    const checkDate = new Date();

    // If today is checked, start from today. Otherwise, start from yesterday.
    const todayKey = toDateKey(checkDate);
    if (!completions[todayKey]) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const k = toDateKey(checkDate);
      if (completions[k]) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  };

  // Render Table & Metrics
  const renderHabits = () => {
    const week = getWeekDates(activeWeekDate);
    const firstDay = week[0];
    const lastDay = week[6];

    const monthFmt = (d) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    currentWeekRangeEl.textContent = `${monthFmt(firstDay)} – ${monthFmt(lastDay)}, ${firstDay.getFullYear()}`;

    const todayKey = toDateKey(new Date());

    // Update Header Row with day names and dates
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    let headerHtml = `
      <th class="th-habit">Habit</th>
      <th class="th-time">Time</th>
      <th class="th-streak">Streak</th>
    `;

    week.forEach((d, idx) => {
      const dKey = toDateKey(d);
      const isToday = dKey === todayKey;
      headerHtml += `
        <th class="th-day ${isToday ? 'today-th' : ''}">
          <div class="day-th-name">${dayNames[idx]}</div>
          <div class="day-th-num">${d.getDate()}</div>
        </th>
      `;
    });
    headerHtml += `<th class="th-act"></th>`;
    habitsDaysHeaderRow.innerHTML = headerHtml;
    updateSortControls();

    // Render Body Rows
    habitsTableBody.innerHTML = '';
    if (habits.length === 0) {
      habitsTableBody.innerHTML = `<tr><td colspan="11" class="empty-state">No habits created yet. Click "+ New Habit" to get started!</td></tr>`;
      updateSummaryMetrics(0, 0, 0);
      return;
    }

    let totalPossible = habits.length * 7;
    let totalCompletedThisWeek = 0;
    let maxStreak = 0;

    const displayedHabits = getSortedHabits();
    displayedHabits.forEach(habit => {
      const streak = calculateStreak(habit.completions);
      if (streak > maxStreak) maxStreak = streak;

      const timeVal = getTimeOfDay(habit);
      const timeClass = `tag-${timeVal.toLowerCase()}`;
      const tr = document.createElement('tr');
      tr.className = 'habit-row';
      tr.draggable = true;
      tr.dataset.habitId = habit.id;

      let rowHtml = `
        <td class="td-habit">
          <span class="habit-name-text">${escapeHtml(habit.name)}</span>
          <span class="habit-target-sub">${habit.target || 'Daily'}</span>
        </td>
        <td class="td-time"><span class="slot-badge ${timeClass}">${escapeHtml(timeVal)}</span></td>
        <td class="td-streak"><span class="streak-badge">🔥 ${streak}</span></td>
      `;

      // 7 day circles
      week.forEach(d => {
        const dKey = toDateKey(d);
        const isCompleted = !!(habit.completions && habit.completions[dKey]);
        if (isCompleted) totalCompletedThisWeek++;

        rowHtml += `
          <td class="td-check">
            <button type="button" class="habit-check-circle ${isCompleted ? 'checked' : ''}" data-hid="${habit.id}" data-date="${dKey}" aria-label="Toggle habit for ${dKey}">
              ${isCompleted ? '✔' : ''}
            </button>
          </td>
        `;
      });

      rowHtml += `
        <td class="td-act">
          <button type="button" class="action-btn edit-habit-btn" data-hid="${escapeHtml(String(habit.id))}" title="Edit Habit" aria-label="Edit habit ${escapeHtml(habit.name)}">${editSVG}</button>
          <button type="button" class="action-btn del-habit-btn" data-hid="${habit.id}" title="Delete Habit">${deleteSVG}</button>
        </td>
      `;

      tr.innerHTML = rowHtml;

      // Event listeners for toggle circles
      tr.querySelectorAll('.habit-check-circle').forEach(btn => {
        btn.addEventListener('click', () => {
          const hid = btn.dataset.hid;
          const dateStr = btn.dataset.date;
          const targetHabit = habits.find(h => h.id === hid);
          if (targetHabit) {
            if (!targetHabit.completions) targetHabit.completions = {};
            targetHabit.completions[dateStr] = !targetHabit.completions[dateStr];
            saveHabits(habits);
            renderHabits();
          }
        });
      });

      tr.querySelector('.edit-habit-btn').addEventListener('click', () => {
        editingHabitId = habit.id;
        habitNameInput.value = habit.name || '';
        selectedHabitTime = getTimeOfDay(habit);
        habitTargetSelect.value = habit.target || 'Daily';
        habitTimePills.querySelectorAll('.pill').forEach(pill => {
          pill.classList.toggle('selected', pill.dataset.time === selectedHabitTime);
        });
        habitModalTitle.textContent = 'Edit Habit';
        saveHabitBtn.textContent = 'Save Changes';
        newHabitModal.showModal();
        habitNameInput.focus();
      });

      // Event listener for delete habit
      tr.querySelector('.del-habit-btn').addEventListener('click', () => {
        if (confirm(`Delete habit "${habit.name}"?`)) {
          habits = habits.filter(h => h.id !== habit.id);
          saveHabits(habits);
          renderHabits();
        }
      });

      // Drag & drop handlers for reordering
      tr.addEventListener('dragstart', (e) => {
        if (e.target.closest('button')) {
          e.preventDefault();
          return;
        }
        draggedHabitId = habit.id;
        tr.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', habit.id);
      });

      tr.addEventListener('dragend', () => {
        tr.classList.remove('dragging');
        document.querySelectorAll('.habit-row').forEach(r => r.classList.remove('drag-over-top', 'drag-over-bottom'));
        draggedHabitId = null;
      });

      tr.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!draggedHabitId || draggedHabitId === habit.id) return;
        const rect = tr.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const isTop = e.clientY < midY;
        tr.classList.toggle('drag-over-top', isTop);
        tr.classList.toggle('drag-over-bottom', !isTop);
      });

      tr.addEventListener('dragleave', () => {
        tr.classList.remove('drag-over-top', 'drag-over-bottom');
      });

      tr.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        tr.classList.remove('drag-over-top', 'drag-over-bottom');
        if (!draggedHabitId || draggedHabitId === habit.id) return;

        const draggedIndex = displayedHabits.findIndex(h => h.id === draggedHabitId);
        const targetIndex = displayedHabits.findIndex(h => h.id === habit.id);
        if (draggedIndex === -1 || targetIndex === -1) return;

        const [movedHabit] = displayedHabits.splice(draggedIndex, 1);
        const rect = tr.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const insertBefore = e.clientY < midY;

        let newIdx = displayedHabits.findIndex(h => h.id === habit.id);
        if (!insertBefore) newIdx++;
        displayedHabits.splice(newIdx, 0, movedHabit);

        habits = displayedHabits;
        habitSortMode = 'custom';
        localStorage.setItem(habitSortModeKey, habitSortMode);
        saveHabits(habits);
        renderHabits();
      });

      habitsTableBody.appendChild(tr);
    });

    const consistencyPct = totalPossible === 0 ? 0 : Math.round((totalCompletedThisWeek / totalPossible) * 100);
    updateSummaryMetrics(consistencyPct, habits.length, maxStreak);
  };

  const updateSummaryMetrics = (consistency, count, streak) => {
    metricConsistency.textContent = `${consistency}%`;
    metricProgressBar.style.width = `${consistency}%`;
    metricActiveCount.textContent = count;
    metricLongestStreak.textContent = `🔥 ${streak} days`;
  };

  // Week Navigation
  prevWeekBtn.addEventListener('click', () => {
    activeWeekDate.setDate(activeWeekDate.getDate() - 7);
    renderHabits();
  });

  nextWeekBtn.addEventListener('click', () => {
    activeWeekDate.setDate(activeWeekDate.getDate() + 7);
    renderHabits();
  });

  currentWeekBtn.addEventListener('click', () => {
    activeWeekDate = new Date();
    renderHabits();
  });

  sortHabitsByTimeBtn.addEventListener('click', () => {
    habitSortMode = 'time';
    localStorage.setItem(habitSortModeKey, habitSortMode);
    renderHabits();
  });

  sortHabitsCustomBtn.addEventListener('click', () => {
    if (habitSortMode !== 'custom') {
      habits = getSortedHabits();
      saveHabits(habits);
    }
    habitSortMode = 'custom';
    localStorage.setItem(habitSortModeKey, habitSortMode);
    renderHabits();
  });

  // Modal Time Pills
  if (habitTimePills) {
    habitTimePills.querySelectorAll('.pill').forEach(pill => {
      pill.addEventListener('click', () => {
        habitTimePills.querySelectorAll('.pill').forEach(p => p.classList.remove('selected'));
        pill.classList.add('selected');
        selectedHabitTime = pill.dataset.time || pill.dataset.cat || 'Anytime';
      });
    });
  }

  // Add Habit Form
  openAddHabitBtn.addEventListener('click', () => {
    editingHabitId = null;
    habitNameInput.value = '';
    selectedHabitTime = 'Morning';
    habitTargetSelect.value = 'Daily';
    if (habitTimePills) {
      habitTimePills.querySelectorAll('.pill').forEach(p => {
        p.classList.toggle('selected', (p.dataset.time || p.dataset.cat) === 'Morning');
      });
    }
    habitModalTitle.textContent = 'Create New Habit';
    saveHabitBtn.textContent = 'Add Habit';
    newHabitModal.showModal();
    habitNameInput.focus();
  });

  closeHabitModalBtn.addEventListener('click', () => {
    editingHabitId = null;
    newHabitModal.close();
  });

  newHabitForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = habitNameInput.value.trim();
    if (!name) return;

    if (editingHabitId !== null) {
      const habitToUpdate = habits.find(habit => habit.id === editingHabitId);
      if (!habitToUpdate) return;
      habitToUpdate.name = name;
      habitToUpdate.timeOfDay = selectedHabitTime;
      habitToUpdate.target = habitTargetSelect.value || 'Daily';
    } else {
      habits.push({
        id: 'h-' + Date.now(),
        name,
        timeOfDay: selectedHabitTime,
        target: habitTargetSelect.value || 'Daily',
        completions: {}
      });
    }
    editingHabitId = null;
    saveHabits(habits);
    newHabitModal.close();
    renderHabits();
  });

  // Initial render
  renderHabits();
});
