// Google-style calendar with month/week/day views, ICS import, and optional Google sync
document.addEventListener('DOMContentLoaded', () => {
  const GOOGLE_CLIENT_ID = '111319810217-66p8c9esisfv5k0lvdcj4j332onllj15.apps.googleusercontent.com';
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
  let selectedCategory = 'Work';
  let calendarView = 'week';

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
  const eventCategoryPills = document.getElementById('eventCategoryPills');
  const dayEventsList = document.getElementById('dayEventsList');
  const upcomingEventsList = document.getElementById('upcomingEventsList');
  const monthView = document.getElementById('monthView');
  const weekView = document.getElementById('weekView');
  const dayView = document.getElementById('dayView');
  const weekHeader = document.getElementById('weekHeader');
  const weekGrid = document.getElementById('weekGrid');
  const dayGrid = document.getElementById('dayGrid');
  const syncStatusEl = document.getElementById('calendarSyncStatus');
  const icsImportInput = document.getElementById('icsImportInput');
  const googleSyncBtn = document.getElementById('googleSyncBtn');

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
      { id: 'ev-1', title: 'Product Architecture Review', date: todayStr, time: '10:00', endTime: '11:00', category: 'Work' },
      { id: 'ev-2', title: 'Coffee & Strategy Chat', date: todayStr, time: '14:30', endTime: '15:15', category: 'Personal' },
      { id: 'ev-3', title: 'Quarterly Planning Sprint', date: toDateKey(tomorrow), time: '09:00', endTime: '10:30', category: 'Urgent' },
      { id: 'ev-4', title: 'Weekly Wellness & Reset', date: toDateKey(nextWeek), time: '17:00', endTime: '18:00', category: 'Wellness' }
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

  const eventsForDate = (key) => {
    return events
      .filter((e) => e.date === key)
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  };

  eventCategoryPills.querySelectorAll('.pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      eventCategoryPills.querySelectorAll('.pill').forEach((p) => p.classList.remove('selected'));
      pill.classList.add('selected');
      selectedCategory = pill.dataset.cat;
    });
  });

  document.querySelectorAll('#calendarViewToggle .btn-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      calendarView = btn.dataset.view;
      document.querySelectorAll('#calendarViewToggle .btn-toggle').forEach((b) => {
        b.classList.toggle('active', b === btn);
      });
      renderCalendar();
    });
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

    eventsForDate(key).forEach((ev) => {
      const block = document.createElement('button');
      block.type = 'button';
      block.className = `gcal-event tag-${(ev.category || 'work').toLowerCase()}`;
      block.style.cssText = eventBlockStyle(ev);
      block.title = `${ev.time}–${ev.endTime} ${ev.title}`;
      block.innerHTML = `<strong>${escapeHtml(ev.title)}</strong><span>${escapeHtml(ev.time || '')} – ${escapeHtml(ev.endTime || '')}</span>`;
      block.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedDate = parseDateKey(key);
        renderCalendar();
      });
      col.appendChild(block);
    });

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
        eventsHtml += `<div class="event-mini-pill tag-${(ev.category || 'work').toLowerCase()}" title="${ev.time} - ${escapeHtml(ev.title)}">${escapeHtml(ev.title)}</div>`;
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
  };

  const renderSelectedDayEvents = () => {
    const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
    selectedDateTitle.textContent = selectedDate.toLocaleDateString(undefined, options);
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
          <span class="event-category-badge tag-${(ev.category || 'work').toLowerCase()}">${escapeHtml(ev.category || '')}</span>
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

  const renderUpcomingEvents = () => {
    const todayKey = toDateKey(new Date());
    const upcoming = events.filter((e) => e.date >= todayKey)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''));
    upcomingEventsList.innerHTML = '';
    if (upcoming.length === 0) {
      upcomingEventsList.innerHTML = `<p class="empty-state">No upcoming events.</p>`;
      return;
    }
    upcoming.slice(0, 8).forEach((ev) => {
      const item = document.createElement('div');
      item.className = 'upcoming-item';
      item.innerHTML = `
        <div class="upcoming-date-col">
          <span class="upcoming-date">${ev.date.substring(5)}</span>
          <span class="upcoming-time">${ev.time || ''}</span>
        </div>
        <div class="upcoming-info-col">
          <span class="upcoming-title">${escapeHtml(ev.title)}</span>
          <span class="slot-badge tag-${(ev.category || 'work').toLowerCase()}">${escapeHtml(ev.category || '')}</span>
        </div>
      `;
      upcomingEventsList.appendChild(item);
    });
  };

  const renderCalendar = () => {
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

  addEventForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = eventTitleInput.value.trim();
    if (!title) return;
    events.push({
      id: 'ev-' + Date.now(),
      title,
      date: toDateKey(selectedDate),
      time: eventTimeInput.value || '09:00',
      endTime: eventEndTimeInput.value || addMinutesToTime(eventTimeInput.value || '09:00', 60),
      category: selectedCategory,
      source: 'local'
    });
    saveEvents(events);
    eventTitleInput.value = '';
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
        category: 'Work',
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

  const mergeGoogleEvents = (items) => {
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
      const existing = events.find((e) => e.googleId === item.id);
      const payload = {
        title: item.summary || '(No title)',
        date: start.date,
        time: start.time,
        endTime: end.date === start.date ? end.time : addMinutesToTime(start.time, 60),
        category: 'Work',
        source: 'google',
        googleId: item.id
      };
      if (existing) {
        Object.assign(existing, payload);
        updated += 1;
      } else {
        events.push({ id: 'gcal-' + item.id, ...payload });
        added += 1;
      }
    });
    saveEvents(events);
    return { added, updated };
  };

  const pullGoogleEvents = async (token) => {
    const from = new Date(selectedDate);
    from.setMonth(from.getMonth() - 1);
    const to = new Date(selectedDate);
    to.setMonth(to.getMonth() + 2);
    const items = [];
    let pageToken = '';
    do {
      const params = new URLSearchParams({
        timeMin: from.toISOString(),
        timeMax: to.toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '250'
      });
      if (pageToken) params.set('pageToken', pageToken);
      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Google Calendar request failed');
      const data = await res.json();
      items.push(...(data.items || []));
      pageToken = data.nextPageToken || '';
    } while (pageToken);
    return mergeGoogleEvents(items);
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
          setSyncStatus('Importing Google Calendar events...');
          try {
            const { added, updated } = await pullGoogleEvents(resp.access_token);
            setSyncStatus(`Synced from Google: ${added} new, ${updated} updated.`);
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
