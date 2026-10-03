// Habits Tracker Logic & Streak Engine
document.addEventListener('DOMContentLoaded', () => {
  // SVGs
  const deleteSVG = `<svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg>`;

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
  let selectedHabitCategory = 'Mind';

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

  // Modal Elements
  const openAddHabitBtn = document.getElementById('openAddHabitBtn');
  const newHabitModal = document.getElementById('newHabitModal');
  const newHabitForm = document.getElementById('newHabitForm');
  const habitNameInput = document.getElementById('habitNameInput');
  const habitCategoryPills = document.getElementById('habitCategoryPills');
  const habitTargetSelect = document.getElementById('habitTargetSelect');
  const closeHabitModalBtn = document.getElementById('closeHabitModalBtn');

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
    if (raw) {
      try { return JSON.parse(raw); } catch (e) { return []; }
    }

    const today = new Date();
    const dMinus1 = new Date(today); dMinus1.setDate(today.getDate() - 1);
    const dMinus2 = new Date(today); dMinus2.setDate(today.getDate() - 2);
    const dMinus3 = new Date(today); dMinus3.setDate(today.getDate() - 3);

    const defaultHabits = [
      {
        id: 'h-1',
        name: 'Morning Mindfulness & Meditation',
        category: 'Mind',
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
        category: 'Health',
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
        category: 'Fitness',
        target: '5x / week',
        completions: {
          [toDateKey(dMinus1)]: true,
          [toDateKey(dMinus2)]: true
        }
      },
      {
        id: 'h-4',
        name: 'Evening Reading (20 pages)',
        category: 'Productivity',
        target: 'Daily',
        completions: {
          [toDateKey(today)]: true,
          [toDateKey(dMinus1)]: true
        }
      }
    ];
    localStorage.setItem('simpleDay_habits_data', JSON.stringify(defaultHabits));
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
      <th class="th-cat">Category</th>
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

    habits.forEach(habit => {
      const streak = calculateStreak(habit.completions);
      if (streak > maxStreak) maxStreak = streak;

      const catClass = `tag-${habit.category.toLowerCase()}`;
      const tr = document.createElement('tr');
      tr.className = 'habit-row';

      let rowHtml = `
        <td class="td-habit">
          <span class="habit-name-text">${escapeHtml(habit.name)}</span>
          <span class="habit-target-sub">${habit.target || 'Daily'}</span>
        </td>
        <td class="td-cat"><span class="slot-badge ${catClass}">${habit.category}</span></td>
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

      // Event listener for delete habit
      tr.querySelector('.del-habit-btn').addEventListener('click', () => {
        if (confirm(`Delete habit "${habit.name}"?`)) {
          habits = habits.filter(h => h.id !== habit.id);
          saveHabits(habits);
          renderHabits();
        }
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

  // Modal Category Pills
  habitCategoryPills.querySelectorAll('.pill').forEach(pill => {
    pill.addEventListener('click', () => {
      habitCategoryPills.querySelectorAll('.pill').forEach(p => p.classList.remove('selected'));
      pill.classList.add('selected');
      selectedHabitCategory = pill.dataset.cat;
    });
  });

  // Add Habit Form
  openAddHabitBtn.addEventListener('click', () => {
    habitNameInput.value = '';
    newHabitModal.showModal();
    habitNameInput.focus();
  });

  closeHabitModalBtn.addEventListener('click', () => newHabitModal.close());

  newHabitForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = habitNameInput.value.trim();
    if (!name) return;

    const newHabit = {
      id: 'h-' + Date.now(),
      name,
      category: selectedHabitCategory,
      target: habitTargetSelect.value || 'Daily',
      completions: {}
    };

    habits.push(newHabit);
    saveHabits(habits);
    newHabitModal.close();
    renderHabits();
  });

  // Initial render
  renderHabits();
});
