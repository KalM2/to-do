// Calendar Logic & Event Management
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
  let currentDate = new Date();
  let displayedYear = currentDate.getFullYear();
  let displayedMonth = currentDate.getMonth();
  let selectedDate = new Date();
  let selectedCategory = 'Work';

  // DOM Elements
  const currentMonthYearEl = document.getElementById('currentMonthYear');
  const prevMonthBtn = document.getElementById('prevMonthBtn');
  const nextMonthBtn = document.getElementById('nextMonthBtn');
  const todayMonthBtn = document.getElementById('todayMonthBtn');
  const calendarDaysGrid = document.getElementById('calendarDaysGrid');
  const selectedDateTitle = document.getElementById('selectedDateTitle');
  const addEventForm = document.getElementById('addEventForm');
  const eventTitleInput = document.getElementById('eventTitleInput');
  const eventTimeInput = document.getElementById('eventTimeInput');
  const eventCategoryPills = document.getElementById('eventCategoryPills');
  const dayEventsList = document.getElementById('dayEventsList');
  const upcomingEventsList = document.getElementById('upcomingEventsList');

  // Load events
  const loadEvents = () => {
    const raw = localStorage.getItem('simpleDay_calendar_events');
    if (raw) {
      try { return JSON.parse(raw); } catch (e) { return []; }
    }

    // Starter seed events
    const todayStr = toDateKey(new Date());
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = toDateKey(tomorrow);

    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 4);
    const nextWeekStr = toDateKey(nextWeek);

    const defaultEvents = [
      { id: 'ev-1', title: 'Product Architecture Review', date: todayStr, time: '10:00', category: 'Work' },
      { id: 'ev-2', title: 'Coffee & Strategy Chat', date: todayStr, time: '14:30', category: 'Personal' },
      { id: 'ev-3', title: 'Quarterly Planning Sprint', date: tomorrowStr, time: '09:00', category: 'Urgent' },
      { id: 'ev-4', title: 'Weekly Wellness & Reset', date: nextWeekStr, time: '17:00', category: 'Wellness' }
    ];
    localStorage.setItem('simpleDay_calendar_events', JSON.stringify(defaultEvents));
    return defaultEvents;
  };

  const saveEvents = (events) => {
    localStorage.setItem('simpleDay_calendar_events', JSON.stringify(events));
  };

  let events = loadEvents();

  // Category Pills
  eventCategoryPills.querySelectorAll('.pill').forEach(pill => {
    pill.addEventListener('click', () => {
      eventCategoryPills.querySelectorAll('.pill').forEach(p => p.classList.remove('selected'));
      pill.classList.add('selected');
      selectedCategory = pill.dataset.cat;
    });
  });

  // Render Month Grid
  const renderCalendar = () => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    currentMonthYearEl.textContent = `${monthNames[displayedMonth]} ${displayedYear}`;

    calendarDaysGrid.innerHTML = '';

    const firstDayIndex = new Date(displayedYear, displayedMonth, 1).getDay();
    const totalDays = new Date(displayedYear, displayedMonth + 1, 0).getDate();
    const prevMonthDays = new Date(displayedYear, displayedMonth, 0).getDate();

    const todayKey = toDateKey(new Date());
    const selectedKey = toDateKey(selectedDate);

    // Prev month padding days
    for (let x = firstDayIndex; x > 0; x--) {
      const dayNum = prevMonthDays - x + 1;
      const cell = document.createElement('div');
      cell.className = 'calendar-day-cell other-month';
      cell.innerHTML = `<span class="day-num">${dayNum}</span>`;
      calendarDaysGrid.appendChild(cell);
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const cellDate = new Date(displayedYear, displayedMonth, i);
      const cellDateKey = toDateKey(cellDate);

      const cell = document.createElement('div');
      cell.className = 'calendar-day-cell';
      if (cellDateKey === todayKey) cell.classList.add('today-cell');
      if (cellDateKey === selectedKey) cell.classList.add('selected-cell');

      // Filter events for this day
      const dayEvs = events.filter(e => e.date === cellDateKey);

      let eventsHtml = '';
      dayEvs.slice(0, 2).forEach(ev => {
        const catClass = `tag-${ev.category.toLowerCase()}`;
        eventsHtml += `<div class="event-mini-pill ${catClass}" title="${ev.time} - ${ev.title}">${escapeHtml(ev.title)}</div>`;
      });
      if (dayEvs.length > 2) {
        eventsHtml += `<div class="event-more-indicator">+${dayEvs.length - 2} more</div>`;
      }

      cell.innerHTML = `
        <span class="day-num">${i}</span>
        <div class="day-cell-events">${eventsHtml}</div>
      `;

      cell.addEventListener('click', () => {
        selectedDate = new Date(displayedYear, displayedMonth, i);
        renderCalendar();
        renderSelectedDayEvents();
      });

      calendarDaysGrid.appendChild(cell);
    }

    // Next month padding days to round up to complete weeks (multiple of 7)
    const totalCellsSoFar = firstDayIndex + totalDays;
    const remainingCells = (7 - (totalCellsSoFar % 7)) % 7;
    for (let j = 1; j <= remainingCells; j++) {
      const cell = document.createElement('div');
      cell.className = 'calendar-day-cell other-month';
      cell.innerHTML = `<span class="day-num">${j}</span>`;
      calendarDaysGrid.appendChild(cell);
    }

    renderSelectedDayEvents();
    renderUpcomingEvents();
  };

  // Render events for selected day
  const renderSelectedDayEvents = () => {
    const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
    selectedDateTitle.textContent = `Agenda: ${selectedDate.toLocaleDateString(undefined, options)}`;

    const selKey = toDateKey(selectedDate);
    const dayEvs = events.filter(e => e.date === selKey);
    dayEvs.sort((a, b) => (a.time || '').localeCompare(b.time || ''));

    dayEventsList.innerHTML = '';
    if (dayEvs.length === 0) {
      dayEventsList.innerHTML = `<p class="empty-state">No events scheduled for this day.</p>`;
      return;
    }

    dayEvs.forEach(ev => {
      const item = document.createElement('div');
      item.className = 'day-event-card';
      const catClass = `tag-${ev.category.toLowerCase()}`;
      item.innerHTML = `
        <div class="event-card-left">
          <span class="event-time-badge">${ev.time || 'All Day'}</span>
          <span class="event-title-text">${escapeHtml(ev.title)}</span>
          <span class="event-category-badge ${catClass}">${ev.category}</span>
        </div>
        <button type="button" class="action-btn del-btn" title="Delete Event">${deleteSVG}</button>
      `;

      item.querySelector('.del-btn').addEventListener('click', () => {
        events = events.filter(e => e.id !== ev.id);
        saveEvents(events);
        renderCalendar();
      });

      dayEventsList.appendChild(item);
    });
  };

  // Render upcoming events across the calendar
  const renderUpcomingEvents = () => {
    const todayKey = toDateKey(new Date());
    const upcoming = events.filter(e => e.date >= todayKey);
    upcoming.sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''));

    upcomingEventsList.innerHTML = '';
    if (upcoming.length === 0) {
      upcomingEventsList.innerHTML = `<p class="empty-state">No upcoming events this month.</p>`;
      return;
    }

    upcoming.slice(0, 5).forEach(ev => {
      const item = document.createElement('div');
      item.className = 'upcoming-item';
      const catClass = `tag-${ev.category.toLowerCase()}`;
      item.innerHTML = `
        <div class="upcoming-date-col">
          <span class="upcoming-date">${ev.date.substring(5)}</span>
          <span class="upcoming-time">${ev.time || ''}</span>
        </div>
        <div class="upcoming-info-col">
          <span class="upcoming-title">${escapeHtml(ev.title)}</span>
          <span class="slot-badge ${catClass}">${ev.category}</span>
        </div>
      `;
      upcomingEventsList.appendChild(item);
    });
  };

  // Add Event Form Handler
  addEventForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = eventTitleInput.value.trim();
    if (!title) return;

    const newEvent = {
      id: 'ev-' + Date.now(),
      title,
      date: toDateKey(selectedDate),
      time: eventTimeInput.value || '09:00',
      category: selectedCategory
    };

    events.push(newEvent);
    saveEvents(events);
    eventTitleInput.value = '';
    renderCalendar();
  });

  // Navigation handlers
  prevMonthBtn.addEventListener('click', () => {
    displayedMonth--;
    if (displayedMonth < 0) {
      displayedMonth = 11;
      displayedYear--;
    }
    renderCalendar();
  });

  nextMonthBtn.addEventListener('click', () => {
    displayedMonth++;
    if (displayedMonth > 11) {
      displayedMonth = 0;
      displayedYear++;
    }
    renderCalendar();
  });

  todayMonthBtn.addEventListener('click', () => {
    currentDate = new Date();
    displayedYear = currentDate.getFullYear();
    displayedMonth = currentDate.getMonth();
    selectedDate = new Date();
    renderCalendar();
  });

  // Initial render
  renderCalendar();
});
