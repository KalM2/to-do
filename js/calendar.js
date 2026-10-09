// Google-style calendar with month/week/day views, ICS import, and optional Google sync
document.addEventListener('DOMContentLoaded', () => {
  const GOOGLE_CLIENT_ID = '111319810217-66p8c9esisfv5k0lvdcj4j332onllj15.apps.googleusercontent.com';
  const GOOGLE_CALENDARS_KEY = 'simpleDay_google_calendars';
  const GOOGLE_VISIBILITY_KEY = 'simpleDay_google_calendar_visibility';
  const UPCOMING_VISIBILITY_KEY = 'simpleDay_upcoming_calendar_visibility';
  const deleteSVG = `<svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg>`;
  const HOUR_HEIGHT = 56;
  const DAY_START = 0;
  const DAY_END = 24;

  const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
  };

  const toDateKey = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const parseDateKey = (key) => {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const minutesFromTime = (time) => {
    if (!time) return 9 * 60;
    const [h, min] = time.split(':').map(Number);
    return (h || 0) * 60 + (min || 0);
  };

  const timeFromMinutes = (mins) => {
    const clamped = Math.max(0, Math.min(23 * 60 + 59, mins));
    const h = Math.floor(clamped / 60);
    const m = clamped % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const addMinutesToTime = (time, add) => timeFromMinutes(minutesFromTime(time) + add);

  const startOfWeek = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay());
    return d;
  };

  let currentDate = new Date();
  let displayedYear = currentDate.getFullYear();
  let displayedMonth = currentDate.getMonth();
  let selectedDate = new Date();
  selectedDate.setHours(0, 0, 0, 0);
  let calendarView = 'week';
  let googleCalendars = [];
  let calendarVisibility = {};
  let upcomingCalendarVisibility = {};
  let upcomingRange = 'week';
  try {
    googleCalendars = JSON.parse(localStorage.getItem(GOOGLE_CALENDARS_KEY) || '[]');
    calendarVisibility = JSON.parse(localStorage.getItem(GOOGLE_VISIBILITY_KEY) || '{}');
    upcomingCalendarVisibility = JSON.parse(localStorage.getItem(UPCOMING_VISIBILITY_KEY) || '{}');
  } catch (e) {
    googleCalendars = [];
    calendarVisibility = {};
    upcomingCalendarVisibility = {};
  }

  const currentMonthYearEl = document.getElementById('currentMonthYear');
  const prevRangeBtn = document.getElementById('prevRangeBtn');
  const nextRangeBtn = document.getElementById('nextRangeBtn');
  const todayMonthBtn = document.getElementById('todayMonthBtn');
  const calendarDaysGrid = document.getElementById('calendarDaysGrid');
  const selectedDateTitle = document.getElementById('selectedDateTitle');
  const addEventForm = document.getElementById('addEventForm');
  const eventTitleInput = document.getElementById('eventTitleInput');
  const eventTimeInput = document.getElementById('eventTimeInput');
  const eventEndTimeInput = document.getElementById('eventEndTimeInput');
  const eventCalendarSelect = document.getElementById('eventCalendarSelect');
  const addEventBtn = document.getElementById('addEventBtn');
  const eventPreviewModal = document.getElementById('eventPreviewModal');
  const eventPreviewTitle = document.getElementById('eventPreviewTitle');
  const eventPreviewDateTime = document.getElementById('eventPreviewDateTime');
  const eventPreviewCalendar = document.getElementById('eventPreviewCalendar');
  const closeEventPreviewBtn = document.getElementById('closeEventPreviewBtn');
  const closeEventPreviewIcon = document.getElementById('closeEventPreviewIcon');
  const dayEventsList = document.getElementById('dayEventsList');
  const upcomingEventsList = document.getElementById('upcomingEventsList');
  const upcomingCalendarFilters = document.getElementById('upcomingCalendarFilters');
  const upcomingRangeToggle = document.getElementById('upcomingRangeToggle');
  const googleCalendarsList = document.getElementById('googleCalendarsList');
  const googleCalendarsMessage = document.getElementById('googleCalendarsMessage');
  const monthView = document.getElementById('monthView');
  const weekView = document.getElementById('weekView');
  const dayView = document.getElementById('dayView');
  const weekHeader = document.getElementById('weekHeader');
  const weekGrid = document.getElementById('weekGrid');
  const dayGrid = document.getElementById('dayGrid');
  const dayHeader = document.getElementById('dayHeader');
  const syncStatusEl = document.getElementById('calendarSyncStatus');
  const icsImportInput = document.getElementById('icsImportInput');
  const googleSyncBtn = document.getElementById('googleSyncBtn');
  const openAddEventBtn = document.getElementById('openAddEventBtn');
  const addEventModal = document.getElementById('addEventModal');
  const closeAddEventBtn = document.getElementById('closeAddEventBtn');

  const loadEvents = () => {
    const raw = localStorage.getItem('simpleDay_calendar_events');
    if (raw !== null) {
      SimpleDayDefaults.markInitialized('calendar_events');
      try {
        const parsed = JSON.parse(raw);
        return parsed.map((ev) => ({
          ...ev,
          endTime: ev.endTime || addMinutesToTime(ev.time || '09:00', 60)
        }));
      } catch (e) {
        return [];
      }
    }
    if (!SimpleDayDefaults.shouldSeed('calendar_events')) return [];

    const todayStr = toDateKey(new Date());
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 4);
    const defaultEvents = [
      { id: 'ev-1', title: 'Product Architecture Review', date: todayStr, time: '10:00', endTime: '11:00', category: 'Local' },
      { id: 'ev-2', title: 'Coffee & Strategy Chat', date: todayStr, time: '14:30', endTime: '15:15', category: 'Local' },
      { id: 'ev-3', title: 'Quarterly Planning Sprint', date: toDateKey(tomorrow), time: '09:00', endTime: '10:30', category: 'Local' },
      { id: 'ev-4', title: 'Weekly Wellness & Reset', date: toDateKey(nextWeek), time: '17:00', endTime: '18:00', category: 'Local' }
    ];
    localStorage.setItem('simpleDay_calendar_events', JSON.stringify(defaultEvents));
    SimpleDayDefaults.markInitialized('calendar_events');
    return defaultEvents;
  };

  const saveEvents = (list) => {
    localStorage.setItem('simpleDay_calendar_events', JSON.stringify(list));
  };

  let events = loadEvents();

  const setSyncStatus = (msg) => {
    if (syncStatusEl) syncStatusEl.textContent = msg || '';
  };

  const calendarForEvent = (event) => googleCalendars.find((calendar) => calendar.id === event.calendarId);
  const isCalendarVisible = (event) => !event.calendarId || calendarVisibility[event.calendarId] !== false;
  const eventCalendarName = (event) => event.calendarName || calendarForEvent(event)?.summary || event.category || 'Local';
  const eventColorClass = (event) => event.calendarId ? 'google-calendar-colored' : `tag-${(event.category || 'local').toLowerCase()}`;
  const eventColorStyle = (event) => {
    if (!event.calendarId) return '';
    const calendar = calendarForEvent(event);
    const background = event.calendarColor || calendar?.backgroundColor;
    const foreground = event.calendarForegroundColor || calendar?.foregroundColor;
    const styles = [];
    if (/^#[0-9a-f]{6}$/i.test(background || '')) styles.push(`--google-calendar-background:${background}`);
    if (/^#[0-9a-f]{6}$/i.test(foreground || '')) styles.push(`--google-calendar-foreground:${foreground}`);
    return styles.join(';');
  };

  const showEventPreview = (event) => {
    const date = parseDateKey(event.date);
    const formatTime = (time) => {
      const [hour, minute] = (time || '00:00').split(':').map(Number);
      return new Date(2000, 0, 1, hour, minute).toLocaleTimeString(undefined, {
        hour: 'numeric', minute: '2-digit'
      });
    };
    eventPreviewTitle.textContent = event.title || '(No title)';
    eventPreviewDateTime.textContent = `${date.toLocaleDateString(undefined, {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    })} · ${formatTime(event.time)} - ${formatTime(event.endTime)}`;
    eventPreviewCalendar.textContent = eventCalendarName(event);
    eventPreviewModal.showModal();
  };

  const saveCalendarVisibility = () => {
    localStorage.setItem(GOOGLE_VISIBILITY_KEY, JSON.stringify(calendarVisibility));
  };

  const renderEventCalendarOptions = () => {
    const selectedCalendarId = eventCalendarSelect.value;
    const localOption = document.createElement('option');
    localOption.value = '';
    localOption.textContent = 'Local calendar';
    eventCalendarSelect.replaceChildren(localOption);
    googleCalendars.forEach((calendar) => {
      const option = document.createElement('option');
      option.value = calendar.id;
      option.textContent = calendar.canWrite === false
        ? `${calendar.summary} (read only)`
        : calendar.summary;
      option.disabled = calendar.canWrite === false;
      eventCalendarSelect.appendChild(option);
    });
    if ([...eventCalendarSelect.options].some((option) => option.value === selectedCalendarId && !option.disabled)) {
      eventCalendarSelect.value = selectedCalendarId;
    } else {
      eventCalendarSelect.value = '';
    }
  };

  const renderGoogleCalendars = () => {
    googleCalendarsList.innerHTML = '';
    renderEventCalendarOptions();
    if (googleCalendars.length === 0) {
      googleCalendarsMessage.textContent = 'Connect Google Calendar to load your calendars.';
      return;
    }
    googleCalendarsMessage.textContent = '';
    googleCalendars.forEach((calendar) => {
      const visible = calendarVisibility[calendar.id] !== false;
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = `google-calendar-toggle${visible ? ' active' : ''}`;
      toggle.setAttribute('aria-pressed', String(visible));
      toggle.setAttribute('aria-label', `${visible ? 'Hide' : 'Show'} ${calendar.summary}`);
      if (/^#[0-9a-f]{6}$/i.test(calendar.backgroundColor || '')) {
        toggle.style.setProperty('--google-calendar-color', calendar.backgroundColor);
      }
      if (/^#[0-9a-f]{6}$/i.test(calendar.foregroundColor || '')) {
        toggle.style.setProperty('--google-calendar-foreground', calendar.foregroundColor);
      }
      toggle.addEventListener('click', () => {
        calendarVisibility[calendar.id] = !visible;
        saveCalendarVisibility();
        renderGoogleCalendars();
        renderCalendar();
      });
      const swatch = document.createElement('span');
      swatch.className = 'google-calendar-swatch';
      if (/^#[0-9a-f]{6}$/i.test(calendar.backgroundColor || '')) {
        swatch.style.backgroundColor = calendar.backgroundColor;
      }
      const name = document.createElement('span');
      name.className = 'google-calendar-name';
      name.textContent = calendar.summary || calendar.id;
      toggle.append(swatch, name);
      googleCalendarsList.appendChild(toggle);
    });
  };
  renderGoogleCalendars();

  const eventsForDate = (key) => {
    return events
      .filter((e) => e.date === key && isCalendarVisible(e))
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  };

  document.querySelectorAll('#calendarViewToggle .btn-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      calendarView = btn.dataset.view;
      document.querySelectorAll('#calendarViewToggle .btn-toggle').forEach((b) => {
        b.classList.toggle('active', b === btn);
      });
      renderCalendar();
    });
  });

  upcomingRangeToggle.addEventListener('click', (e) => {
    const button = e.target.closest('button[data-range]');
    if (!button) return;
    upcomingRange = button.dataset.range;
    upcomingRangeToggle.querySelectorAll('button[data-range]').forEach((rangeButton) => {
      const active = rangeButton === button;
      rangeButton.classList.toggle('active', active);
      rangeButton.setAttribute('aria-pressed', String(active));
    });
    renderUpcomingEvents();
  });

  const buildHourColumn = () => {
    let html = '<div class="gcal-hours">';
    for (let h = DAY_START; h < DAY_END; h++) {
      const label = h === 0 ? '' : (h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`);
      html += `<div class="gcal-hour-label" style="height:${HOUR_HEIGHT}px">${escapeHtml(label)}</div>`;
    }
    html += '</div>';
    return html;
  };

  const eventBlockStyle = (ev) => {
    const start = minutesFromTime(ev.time || '09:00');
    let end = minutesFromTime(ev.endTime || addMinutesToTime(ev.time || '09:00', 60));
    if (end <= start) end = start + 30;
    const top = (start / 60) * HOUR_HEIGHT;
    const height = Math.max(18, ((end - start) / 60) * HOUR_HEIGHT);
    return `top:${top}px;height:${height}px;`;
  };

  const currentTimeOffset = () => {
    const now = new Date();
    return ((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR_HEIGHT;
  };

  const updateCurrentTimeIndicators = () => {
    const top = `${currentTimeOffset()}px`;
    document.querySelectorAll('.gcal-current-time-line').forEach((line) => {
      line.style.top = top;
    });
  };

  window.setInterval(updateCurrentTimeIndicators, 60 * 1000);

  const renderTimedColumn = (date, withHours) => {
    const key = toDateKey(date);
    const col = document.createElement('div');
    col.className = 'gcal-day-col';
    col.dataset.date = key;
    col.style.minHeight = `${DAY_END * HOUR_HEIGHT}px`;

    let lines = '';
    for (let h = DAY_START; h < DAY_END; h++) {
      lines += `<div class="gcal-hour-line" style="top:${h * HOUR_HEIGHT}px"></div>`;
    }
    col.innerHTML = lines + (withHours ? '' : '');

    if (key === toDateKey(new Date())) {
      const currentTimeLine = document.createElement('div');
      currentTimeLine.className = 'gcal-current-time-line';
      currentTimeLine.setAttribute('aria-hidden', 'true');
      currentTimeLine.style.top = `${currentTimeOffset()}px`;
      col.appendChild(currentTimeLine);
    }

    eventsForDate(key).forEach((ev) => {
      const block = document.createElement('button');
      block.type = 'button';
      block.className = `gcal-event ${eventColorClass(ev)}`;
      block.style.cssText = `${eventBlockStyle(ev)}${eventColorStyle(ev)}`;
      block.title = `${ev.time}–${ev.endTime} ${ev.title}`;
      const duration = minutesFromTime(ev.endTime || addMinutesToTime(ev.time || '09:00', 60)) - minutesFromTime(ev.time || '09:00');
      block.innerHTML = duration < 45
        ? `<strong>${escapeHtml(ev.title)}</strong>`
        : `<strong>${escapeHtml(ev.title)}</strong><span>${escapeHtml(ev.time || '')} – ${escapeHtml(ev.endTime || '')}</span>`;
      block.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedDate = parseDateKey(key);
        renderCalendar();
        showEventPreview(ev);
      });
      block.addEventListener('pointerdown', (e) => e.stopPropagation());
      col.appendChild(block);
    });

    let pointerDrag = null;
    let dragPreview = null;
    const minutesAtPointer = (clientY, maxMinutes) => {
      const bounds = col.getBoundingClientRect();
      const y = Math.max(0, Math.min(bounds.height, clientY - bounds.top));
      const minutes = Math.round((y / HOUR_HEIGHT) * 60 / 15) * 15;
      return Math.max(0, Math.min(maxMinutes, minutes));
    };
    const updateDragPreview = (endMinutes) => {
      const start = Math.min(pointerDrag.start, endMinutes);
      const end = Math.max(pointerDrag.start, endMinutes, start + 15);
      dragPreview.style.top = `${(start / 60) * HOUR_HEIGHT}px`;
      dragPreview.style.height = `${((end - start) / 60) * HOUR_HEIGHT}px`;
    };
    const clearDragPreview = () => {
      dragPreview?.remove();
      dragPreview = null;
      pointerDrag = null;
    };

    col.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.pointerType === 'touch' || e.target.closest('.gcal-event')) return;
      e.preventDefault();
      const start = minutesAtPointer(e.clientY, DAY_END * 60 - 15);
      pointerDrag = { pointerId: e.pointerId, start, startY: e.clientY, moved: false };
      dragPreview = document.createElement('div');
      dragPreview.className = 'gcal-drag-selection';
      dragPreview.setAttribute('aria-hidden', 'true');
      col.appendChild(dragPreview);
      updateDragPreview(start);
      col.setPointerCapture(e.pointerId);
    });

    col.addEventListener('pointermove', (e) => {
      if (!pointerDrag || e.pointerId !== pointerDrag.pointerId) return;
      const current = minutesAtPointer(e.clientY, DAY_END * 60);
      pointerDrag.moved = pointerDrag.moved || Math.abs(e.clientY - pointerDrag.startY) > 6;
      updateDragPreview(current);
    });

    col.addEventListener('pointerup', (e) => {
      if (!pointerDrag || e.pointerId !== pointerDrag.pointerId) return;
      const didDrag = pointerDrag.moved || Math.abs(e.clientY - pointerDrag.startY) > 6;
      const endAtPointer = minutesAtPointer(e.clientY, DAY_END * 60);
      const start = Math.min(pointerDrag.start, endAtPointer);
      const end = Math.max(pointerDrag.start, endAtPointer, start + 15);
      clearDragPreview();
      if (!didDrag) return;

      selectedDate = parseDateKey(key);
      eventTimeInput.value = timeFromMinutes(start);
      eventEndTimeInput.value = timeFromMinutes(end);
      renderCalendar();
      addEventModal.showModal();
      eventTitleInput.focus();
    });

    col.addEventListener('pointercancel', clearDragPreview);

    col.addEventListener('click', (e) => {
      const minutes = Math.round((e.offsetY / HOUR_HEIGHT) * 60 / 15) * 15;
      selectedDate = parseDateKey(key);
      eventTimeInput.value = timeFromMinutes(minutes);
      eventEndTimeInput.value = timeFromMinutes(minutes + 60);
      eventTitleInput.focus();
      renderSelectedDayEvents();
      renderCalendar();
    });

    return col;
  };

  const renderWeek = () => {
    const weekStart = startOfWeek(selectedDate);
    weekHeader.innerHTML = '<div class="gcal-corner"></div>';
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const isToday = toDateKey(d) === toDateKey(new Date());
      const isSelected = toDateKey(d) === toDateKey(selectedDate);
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'gcal-week-head-cell' + (isToday ? ' today-cell' : '') + (isSelected ? ' selected-cell' : '');
      cell.innerHTML = `<span>${d.toLocaleDateString(undefined, { weekday: 'short' })}</span><strong>${d.getDate()}</strong>`;
      cell.addEventListener('click', () => {
        selectedDate = d;
        renderCalendar();
      });
      weekHeader.appendChild(cell);
    }

    weekGrid.innerHTML = buildHourColumn();
    const daysWrap = document.createElement('div');
    daysWrap.className = 'gcal-days-wrap';
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      daysWrap.appendChild(renderTimedColumn(d, false));
    }
    weekGrid.appendChild(daysWrap);

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    currentMonthYearEl.textContent = weekStart.getMonth() === weekEnd.getMonth()
      ? `${monthNames[weekStart.getMonth()]} ${weekStart.getDate()} – ${weekEnd.getDate()}, ${weekStart.getFullYear()}`
      : `${monthNames[weekStart.getMonth()]} ${weekStart.getDate()} – ${monthNames[weekEnd.getMonth()]} ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`;
  };

  const renderDay = () => {
    dayHeader.textContent = selectedDate.toLocaleDateString(undefined, {
      weekday: 'short', month: 'long', day: 'numeric'
    });
    dayGrid.innerHTML = buildHourColumn();
    const wrap = document.createElement('div');
    wrap.className = 'gcal-days-wrap gcal-single-day';
    wrap.appendChild(renderTimedColumn(selectedDate, false));
    dayGrid.appendChild(wrap);
    currentMonthYearEl.textContent = selectedDate.toLocaleDateString(undefined, {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });
  };

  const renderMonth = () => {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    currentMonthYearEl.textContent = `${monthNames[displayedMonth]} ${displayedYear}`;
    calendarDaysGrid.innerHTML = '';

    const firstDayIndex = new Date(displayedYear, displayedMonth, 1).getDay();
    const totalDays = new Date(displayedYear, displayedMonth + 1, 0).getDate();
    const prevMonthDays = new Date(displayedYear, displayedMonth, 0).getDate();
    const todayKey = toDateKey(new Date());
    const selectedKey = toDateKey(selectedDate);

    for (let x = firstDayIndex; x > 0; x--) {
      const cell = document.createElement('div');
      cell.className = 'calendar-day-cell other-month';
      cell.innerHTML = `<span class="day-num">${prevMonthDays - x + 1}</span>`;
      calendarDaysGrid.appendChild(cell);
    }

    for (let i = 1; i <= totalDays; i++) {
      const cellDate = new Date(displayedYear, displayedMonth, i);
      const cellDateKey = toDateKey(cellDate);
      const cell = document.createElement('div');
      cell.className = 'calendar-day-cell';
      if (cellDateKey === todayKey) cell.classList.add('today-cell');
      if (cellDateKey === selectedKey) cell.classList.add('selected-cell');
      const dayEvs = eventsForDate(cellDateKey);
      let eventsHtml = '';
      dayEvs.slice(0, 3).forEach((ev) => {
        const colorStyle = eventColorStyle(ev);
        eventsHtml += `<div class="event-mini-pill ${eventColorClass(ev)}"${colorStyle ? ` style="${colorStyle}"` : ''} title="${ev.time} - ${escapeHtml(ev.title)}">${escapeHtml(ev.title)}</div>`;
      });
      if (dayEvs.length > 3) eventsHtml += `<div class="event-more-indicator">+${dayEvs.length - 3} more</div>`;
      cell.innerHTML = `<span class="day-num">${i}</span><div class="day-cell-events">${eventsHtml}</div>`;
      cell.addEventListener('click', () => {
        selectedDate = new Date(displayedYear, displayedMonth, i);
        renderCalendar();
      });
      calendarDaysGrid.appendChild(cell);
    }

    const totalCellsSoFar = firstDayIndex + totalDays;
    const remainingCells = (7 - (totalCellsSoFar % 7)) % 7;
    for (let j = 1; j <= remainingCells; j++) {
      const cell = document.createElement('div');
      cell.className = 'calendar-day-cell other-month';
      cell.innerHTML = `<span class="day-num">${j}</span>`;
      calendarDaysGrid.appendChild(cell);
    }

    while (calendarDaysGrid.children.length < 42) {
      const day = calendarDaysGrid.children.length - firstDayIndex - totalDays + 1;
      const cell = document.createElement('div');
      cell.className = 'calendar-day-cell other-month';
      cell.innerHTML = `<span class="day-num">${day}</span>`;
      calendarDaysGrid.appendChild(cell);
    }
  };

  const renderSelectedDayEvents = () => {
    const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
    selectedDateTitle.textContent = toDateKey(selectedDate) === toDateKey(new Date())
      ? 'Events for today'
      : `Events for ${selectedDate.toLocaleDateString(undefined, options)}`;
    const dayEvs = eventsForDate(toDateKey(selectedDate));
    dayEventsList.innerHTML = '';
    if (dayEvs.length === 0) {
      dayEventsList.innerHTML = `<p class="empty-state">No events scheduled for this day.</p>`;
      return;
    }
    dayEvs.forEach((ev) => {
      const item = document.createElement('div');
      item.className = 'day-event-card';
      item.innerHTML = `
        <div class="event-card-left">
          <span class="event-time-badge">${ev.time || 'All Day'}–${ev.endTime || ''}</span>
          <span class="event-title-text">${escapeHtml(ev.title)}</span>
          <span class="event-category-badge ${eventColorClass(ev)}"${eventColorStyle(ev) ? ` style="${eventColorStyle(ev)}"` : ''}>${escapeHtml(eventCalendarName(ev))}</span>
        </div>
        <button type="button" class="action-btn del-btn" title="Delete Event">${deleteSVG}</button>
      `;
      item.querySelector('.del-btn').addEventListener('click', () => {
        events = events.filter((e) => e.id !== ev.id);
        saveEvents(events);
        renderCalendar();
      });
      dayEventsList.appendChild(item);
    });
  };

  const renderUpcomingCalendarFilters = () => {
    upcomingCalendarFilters.innerHTML = '';
    const calendars = [
      { id: 'local', summary: 'Local calendar' },
      ...googleCalendars
    ];
    calendars.forEach((calendar) => {
      const option = document.createElement('label');
      option.className = 'upcoming-calendar-option';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = upcomingCalendarVisibility[calendar.id] !== false;
      checkbox.addEventListener('change', () => {
        upcomingCalendarVisibility[calendar.id] = checkbox.checked;
        localStorage.setItem(UPCOMING_VISIBILITY_KEY, JSON.stringify(upcomingCalendarVisibility));
        renderUpcomingEvents();
      });
      const name = document.createElement('span');
      name.textContent = calendar.summary || calendar.id;
      option.append(checkbox, name);
      upcomingCalendarFilters.appendChild(option);
    });
  };

  const renderUpcomingEvents = () => {
    renderUpcomingCalendarFilters();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = toDateKey(today);
    const rangeEnd = upcomingRange === 'week'
      ? startOfWeek(today)
      : new Date(today.getFullYear(), today.getMonth() + 1, 0);
    if (upcomingRange === 'week') rangeEnd.setDate(rangeEnd.getDate() + 6);
    const rangeEndKey = toDateKey(rangeEnd);
    const upcoming = events.filter((event) => {
      const calendarId = event.calendarId || 'local';
      return event.date >= todayKey && event.date <= rangeEndKey && upcomingCalendarVisibility[calendarId] !== false;
    }).sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''));
    upcomingEventsList.innerHTML = '';
    if (upcoming.length === 0) {
      upcomingEventsList.innerHTML = `<p class="empty-state">No upcoming events.</p>`;
      return;
    }
    upcoming.slice(0, 8).forEach((ev) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'upcoming-item';
      const eventDate = parseDateKey(ev.date);
      item.innerHTML = `
        <span class="upcoming-date-col">
          <span class="upcoming-date">${eventDate.toLocaleDateString(undefined, { weekday: 'short' })}</span>
          <span class="upcoming-date-month">${eventDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
          <span class="upcoming-time">${escapeHtml(ev.time || '')}</span>
        </span>
        <span class="upcoming-info-col">
          <span class="upcoming-title">${escapeHtml(ev.title)}</span>
          <span class="slot-badge ${eventColorClass(ev)}"${eventColorStyle(ev) ? ` style="${eventColorStyle(ev)}"` : ''}>${escapeHtml(eventCalendarName(ev))}</span>
        </span>
      `;
      item.addEventListener('click', () => {
        selectedDate = eventDate;
        renderCalendar();
        showEventPreview(ev);
      });
      upcomingEventsList.appendChild(item);
    });
  };

  const renderCalendar = () => {
    const addEventSlots = {
      month: 'monthActionSlot',
      week: 'weekActionSlot',
      day: 'dayActionSlot'
    };
    document.getElementById(addEventSlots[calendarView]).appendChild(openAddEventBtn);
    monthView.classList.toggle('hidden', calendarView !== 'month');
    weekView.classList.toggle('hidden', calendarView !== 'week');
    dayView.classList.toggle('hidden', calendarView !== 'day');
    if (calendarView === 'month') {
      displayedYear = selectedDate.getFullYear();
      displayedMonth = selectedDate.getMonth();
      renderMonth();
    } else if (calendarView === 'week') {
      renderWeek();
    } else {
      renderDay();
    }
    renderSelectedDayEvents();
    renderUpcomingEvents();
  };

  openAddEventBtn.addEventListener('click', () => {
    addEventModal.showModal();
    eventTitleInput.focus();
  });
  closeAddEventBtn.addEventListener('click', () => addEventModal.close());
  closeEventPreviewBtn.addEventListener('click', () => eventPreviewModal.close());
  closeEventPreviewIcon.addEventListener('click', () => eventPreviewModal.close());

  addEventForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = eventTitleInput.value.trim();
    if (!title) return;
    let startMinutes = minutesFromTime(eventTimeInput.value || '09:00');
    let endMinutes = minutesFromTime(eventEndTimeInput.value || addMinutesToTime(eventTimeInput.value || '09:00', 60));
    if (endMinutes <= startMinutes) endMinutes = Math.min(23 * 60 + 59, startMinutes + 30);
    if (endMinutes <= startMinutes) startMinutes = Math.max(0, endMinutes - 30);
    const event = {
      title,
      date: toDateKey(selectedDate),
      time: timeFromMinutes(startMinutes),
      endTime: timeFromMinutes(endMinutes),
      category: 'Local',
      source: 'local'
    };
    const calendarId = eventCalendarSelect.value;
    if (calendarId) {
      const calendar = googleCalendars.find((item) => item.id === calendarId);
      if (!calendar) {
        setSyncStatus('That Google Calendar is no longer available. Sync calendars and try again.');
        return;
      }
      addEventBtn.disabled = true;
      setSyncStatus(`Requesting permission to add an event to ${calendar.summary}...`);
      try {
        const token = await requestGoogleWriteToken();
        const created = await insertGoogleEvent(calendar, event, token);
        mergeGoogleEvents([created], calendar);
        setSyncStatus(`Added event to ${calendar.summary}.`);
      } catch (error) {
        setSyncStatus(`Could not add event to ${calendar.summary}. ${error.message}`);
        return;
      } finally {
        addEventBtn.disabled = false;
      }
    } else {
      events.push({ id: 'ev-' + Date.now(), ...event });
      saveEvents(events);
    }
    eventTitleInput.value = '';
    addEventModal.close();
    renderCalendar();
  });

  prevRangeBtn.addEventListener('click', () => {
    if (calendarView === 'month') {
      selectedDate.setMonth(selectedDate.getMonth() - 1);
    } else if (calendarView === 'week') {
      selectedDate.setDate(selectedDate.getDate() - 7);
    } else {
      selectedDate.setDate(selectedDate.getDate() - 1);
    }
    renderCalendar();
  });

  nextRangeBtn.addEventListener('click', () => {
    if (calendarView === 'month') {
      selectedDate.setMonth(selectedDate.getMonth() + 1);
    } else if (calendarView === 'week') {
      selectedDate.setDate(selectedDate.getDate() + 7);
    } else {
      selectedDate.setDate(selectedDate.getDate() + 1);
    }
    renderCalendar();
  });

  todayMonthBtn.addEventListener('click', () => {
    selectedDate = new Date();
    selectedDate.setHours(0, 0, 0, 0);
    renderCalendar();
  });

  const unfoldIcs = (text) => text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');

  const parseIcsDate = (value) => {
    if (!value) return null;
    const compact = value.replace(/[^0-9TZ]/g, '');
    if (compact.length === 8) {
      return {
        date: `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`,
        time: '00:00'
      };
    }
    const y = compact.slice(0, 4);
    const m = compact.slice(4, 6);
    const d = compact.slice(6, 8);
    const hh = compact.slice(9, 11) || '00';
    const mm = compact.slice(11, 13) || '00';
    if (compact.includes('Z')) {
      const utc = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm)));
      return { date: toDateKey(utc), time: timeFromMinutes(utc.getHours() * 60 + utc.getMinutes()) };
    }
    return { date: `${y}-${m}-${d}`, time: `${hh}:${mm}` };
  };

  const importIcsText = (text) => {
    const unfolded = unfoldIcs(text);
    const blocks = unfolded.split(/BEGIN:VEVENT/i).slice(1);
    let added = 0;
    blocks.forEach((block) => {
      const body = block.split(/END:VEVENT/i)[0];
      const get = (prop) => {
        const re = new RegExp(`^${prop}[^:]*:(.*)$`, 'im');
        const match = body.match(re);
        return match ? match[1].trim() : '';
      };
      const summary = get('SUMMARY').replace(/\\,/g, ',').replace(/\\n/g, ' ');
      const start = parseIcsDate(get('DTSTART'));
      const end = parseIcsDate(get('DTEND'));
      const uid = get('UID');
      if (!summary || !start) return;
      if (uid && events.some((e) => e.uid === uid)) return;
      events.push({
        id: 'ics-' + Date.now() + '-' + added,
        title: summary,
        date: start.date,
        time: start.time,
        endTime: end ? end.time : addMinutesToTime(start.time, 60),
        category: 'Local',
        source: 'ics',
        uid
      });
      added += 1;
    });
    saveEvents(events);
    return added;
  };

  icsImportInput.addEventListener('change', async () => {
    const file = icsImportInput.files && icsImportInput.files[0];
    if (!file) return;
    const text = await file.text();
    const added = importIcsText(text);
    setSyncStatus(`Imported ${added} event${added === 1 ? '' : 's'} from ${file.name}.`);
    icsImportInput.value = '';
    renderCalendar();
  });

  const mergeGoogleEvents = (items, calendar) => {
    let added = 0;
    let updated = 0;
    items.forEach((item) => {
      if (item.status === 'cancelled') return;
      const startRaw = item.start?.dateTime || item.start?.date;
      const endRaw = item.end?.dateTime || item.end?.date;
      if (!startRaw) return;
      const start = item.start?.dateTime
        ? { date: toDateKey(new Date(item.start.dateTime)), time: timeFromMinutes(new Date(item.start.dateTime).getHours() * 60 + new Date(item.start.dateTime).getMinutes()) }
        : { date: startRaw, time: '00:00' };
      const end = item.end?.dateTime
        ? { date: toDateKey(new Date(item.end.dateTime)), time: timeFromMinutes(new Date(item.end.dateTime).getHours() * 60 + new Date(item.end.dateTime).getMinutes()) }
        : { date: start.date, time: addMinutesToTime(start.time, 60) };
      const existing = events.find((e) => e.googleId === item.id && e.calendarId === calendar.id);
      const payload = {
        title: item.summary || '(No title)',
        date: start.date,
        time: start.time,
        endTime: end.date === start.date ? end.time : addMinutesToTime(start.time, 60),
        category: 'Google Calendar',
        source: 'google',
        googleId: item.id,
        calendarId: calendar.id,
        calendarName: calendar.summary,
        calendarColor: calendar.backgroundColor,
        calendarForegroundColor: calendar.foregroundColor
      };
      if (existing) {
        Object.assign(existing, payload);
        updated += 1;
      } else {
        events.push({ id: `gcal-${calendar.id}-${item.id}`, ...payload });
        added += 1;
      }
    });
    saveEvents(events);
    return { added, updated };
  };

  const requestGoogleWriteToken = () => new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      reject(new Error('Google sign-in is unavailable.'));
      return;
    }
    try {
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/calendar.events',
        callback: (response) => {
          if (response.error || !response.access_token) {
            reject(new Error('Google Calendar permission was not granted.'));
            return;
          }
          resolve(response.access_token);
        }
      });
      tokenClient.requestAccessToken({ prompt: '' });
    } catch (error) {
      reject(error);
    }
  });

  const insertGoogleEvent = async (calendar, event, token) => {
    const start = new Date(`${event.date}T${event.time}:00`);
    const end = new Date(`${event.date}T${event.endTime}:00`);
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.id)}/events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          summary: event.title,
          start: { dateTime: start.toISOString() },
          end: { dateTime: end.toISOString() }
        })
      }
    );
    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message || 'Google Calendar could not save the event.');
    return result;
  };

  const fetchGooglePages = async (url, params, token) => {
    const items = [];
    let pageToken = '';
    do {
      const query = new URLSearchParams(params);
      query.set('maxResults', '250');
      if (pageToken) query.set('pageToken', pageToken);
      const response = await fetch(`${url}?${query}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Google Calendar request failed');
      const data = await response.json();
      items.push(...(data.items || []));
      pageToken = data.nextPageToken || '';
    } while (pageToken);
    return items;
  };

  const pullGoogleEvents = async (token) => {
    const calendarItems = await fetchGooglePages(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList',
      {},
      token
    );
    googleCalendars = calendarItems
      .filter((calendar) => !calendar.deleted)
      .map((calendar) => ({
        id: calendar.id,
        summary: calendar.summary || calendar.id,
        backgroundColor: calendar.backgroundColor || '',
        foregroundColor: calendar.foregroundColor || '',
        accessRole: calendar.accessRole || '',
        canWrite: ['owner', 'writer'].includes(calendar.accessRole),
        selected: calendar.selected !== false
      }));
    googleCalendars.forEach((calendar) => {
      if (!Object.prototype.hasOwnProperty.call(calendarVisibility, calendar.id)) {
        calendarVisibility[calendar.id] = calendar.selected;
      }
    });
    localStorage.setItem(GOOGLE_CALENDARS_KEY, JSON.stringify(googleCalendars));
    saveCalendarVisibility();
    renderGoogleCalendars();

    const from = new Date(selectedDate);
    from.setMonth(from.getMonth() - 1);
    const to = new Date(selectedDate);
    to.setMonth(to.getMonth() + 2);
    const params = {
        timeMin: from.toISOString(),
        timeMax: to.toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
        showDeleted: 'true'
    };
    const results = await Promise.all(googleCalendars.map(async (calendar) => {
      try {
        const items = await fetchGooglePages(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.id)}/events`,
          params,
          token
        );
        return { calendar, result: mergeGoogleEvents(items, calendar) };
      } catch (error) {
        return { calendar, error };
      }
    }));
    return results.reduce((total, entry) => ({
      added: total.added + (entry.result?.added || 0),
      updated: total.updated + (entry.result?.updated || 0),
      unavailable: total.unavailable + (entry.error ? 1 : 0)
    }), { added: 0, updated: 0, unavailable: 0 });
  };

  googleSyncBtn.addEventListener('click', () => {
    if (!window.google?.accounts?.oauth2) {
      setSyncStatus('Google sign-in is unavailable. Check your connection and reload.');
      return;
    }
    try {
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/calendar.readonly',
        callback: async (resp) => {
          if (resp.error) {
            setSyncStatus('Google sign-in was cancelled or denied.');
            return;
          }
          setSyncStatus('Loading your Google Calendars and events...');
          try {
            const { added, updated, unavailable } = await pullGoogleEvents(resp.access_token);
            const unavailableMessage = unavailable ? ` ${unavailable} calendar${unavailable === 1 ? '' : 's'} could not be read.` : '';
            setSyncStatus(`Synced from Google: ${added} new, ${updated} updated.${unavailableMessage}`);
            renderCalendar();
          } catch (err) {
            setSyncStatus('Could not read Google Calendar. Check Calendar API access and the registered origin.');
          }
        }
      });
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (err) {
      setSyncStatus('Could not start Google sign-in. Reload the page and try again.');
    }
  });

  renderCalendar();
});
