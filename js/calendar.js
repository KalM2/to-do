// Simple Day – Calendar viewer (read-only event feed)
document.addEventListener('DOMContentLoaded', async () => {
  await window.SimpleDayCloud.ready;
  if (window.SimpleDayCloud.configured && !window.SimpleDayCloud.user) return;
  await window.SimpleDayDB.ready;

  // ─── Constants ────────────────────────────────────────────────────────────
  const GOOGLE_CLIENT_ID = '111319810217-66p8c9esisfv5k0lvdcj4j332onllj15.apps.googleusercontent.com';
  const GOOGLE_CALENDARS_KEY = 'simpleDay_google_calendars';
  const GOOGLE_VISIBILITY_KEY = 'simpleDay_google_calendar_visibility';
  const DAYS_AHEAD = 30; // how many days forward to show in the feed

  // ─── Utilities ────────────────────────────────────────────────────────────
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

  const formatDisplayTime = (time) => {
    const [hour, minute] = (time || '00:00').split(':').map(Number);
    return new Date(2000, 0, 1, hour, minute).toLocaleTimeString(undefined, {
      hour: 'numeric', minute: '2-digit'
    });
  };

  const isToday = (dateKey) => dateKey === toDateKey(new Date());
  const isTomorrow = (dateKey) => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return dateKey === toDateKey(t);
  };

  const friendlyDateLabel = (dateKey) => {
    if (isToday(dateKey)) return 'Events for today';
    const d = parseDateKey(dateKey);
    if (isTomorrow(dateKey)) {
      return `Tomorrow · ${d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}`;
    }
    return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  };

  // ─── State ────────────────────────────────────────────────────────────────
  let googleCalendars = [];
  let calendarVisibility = {};
  try {
    googleCalendars = JSON.parse(localStorage.getItem(GOOGLE_CALENDARS_KEY) || '[]');
    calendarVisibility = JSON.parse(localStorage.getItem(GOOGLE_VISIBILITY_KEY) || '{}');
  } catch (e) {
    googleCalendars = [];
    calendarVisibility = {};
  }

  // ─── DOM refs ─────────────────────────────────────────────────────────────
  const calEventFeed        = document.getElementById('calEventFeed');
  const calCalendarsBar     = document.getElementById('calCalendarsBar');
  const googleCalendarsList = document.getElementById('googleCalendarsList');
  const googleCalendarsMessage = document.getElementById('googleCalendarsMessage');
  const calSyncFeedback     = document.getElementById('calSyncFeedback');
  const calCurrentDateSubtitle = document.getElementById('calCurrentDateSubtitle');
  const totalEventsCount    = document.getElementById('totalEventsCount');
  const openSettingsBtn     = document.getElementById('openSettingsBtn');
  const calendarSettingsModal = document.getElementById('calendarSettingsModal');
  const closeSettingsBtn    = document.getElementById('closeSettingsBtn');
  const closeSettingsIcon   = document.getElementById('closeSettingsIcon');
  const importIcsBtn        = document.getElementById('importIcsBtn');
  const icsImportInput      = document.getElementById('icsImportInput');
  const googleSyncBtn       = document.getElementById('googleSyncBtn');
  const eventPreviewModal   = document.getElementById('eventPreviewModal');
  const eventPreviewTitle   = document.getElementById('eventPreviewTitle');
  const eventPreviewDateTime = document.getElementById('eventPreviewDateTime');
  const eventPreviewCalendar = document.getElementById('eventPreviewCalendar');
  const closeEventPreviewBtn = document.getElementById('closeEventPreviewBtn');
  const closeEventPreviewIcon = document.getElementById('closeEventPreviewIcon');
  // legacy sync status element (kept in HTML hidden, used by setSyncStatus)
  const syncStatusEl = document.getElementById('calendarSyncStatus');

  if (calCurrentDateSubtitle) {
    calCurrentDateSubtitle.textContent = new Date().toLocaleDateString(undefined, {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });
  }

  // ─── Settings Modal Controls ──────────────────────────────────────────────
  if (openSettingsBtn && calendarSettingsModal) {
    openSettingsBtn.addEventListener('click', () => {
      renderCalendarsBar();
      calendarSettingsModal.showModal();
    });
  }
  if (closeSettingsBtn && calendarSettingsModal) {
    closeSettingsBtn.addEventListener('click', () => calendarSettingsModal.close());
  }
  if (closeSettingsIcon && calendarSettingsModal) {
    closeSettingsIcon.addEventListener('click', () => calendarSettingsModal.close());
  }

  // ─── Event data ───────────────────────────────────────────────────────────
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

  // ─── Sync status ──────────────────────────────────────────────────────────
  let feedbackTimer = null;
  const setSyncStatus = (msg) => {
    if (syncStatusEl) syncStatusEl.textContent = msg || '';
    if (!calSyncFeedback) return;
    if (feedbackTimer) clearTimeout(feedbackTimer);
    if (!msg) {
      calSyncFeedback.classList.remove('show');
      return;
    }
    calSyncFeedback.textContent = msg;
    calSyncFeedback.classList.add('show');
    feedbackTimer = setTimeout(() => {
      calSyncFeedback.classList.remove('show');
    }, 4500);
  };

  // ─── Calendar helpers ─────────────────────────────────────────────────────
  const calendarForEvent = (event) => googleCalendars.find((c) => c.id === event.calendarId);
  const isCalendarVisible = (event) => !event.calendarId || calendarVisibility[event.calendarId] !== false;
  const eventCalendarName = (event) => event.calendarName || calendarForEvent(event)?.summary || event.category || 'Local';
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
  const eventAccentStyle = (event) => {
    if (!event.calendarId) return '';
    const calendar = calendarForEvent(event);
    const bg = event.calendarColor || calendar?.backgroundColor;
    return /^#[0-9a-f]{6}$/i.test(bg || '') ? `background:${bg}` : '';
  };

  // ─── My Calendars bar ─────────────────────────────────────────────────────
  const renderCalendarsBar = () => {
    googleCalendarsList.innerHTML = '';
    if (googleCalendars.length === 0) {
      calCalendarsBar.hidden = true;
      return;
    }
    calCalendarsBar.hidden = false;
    googleCalendarsMessage.hidden = true;
    googleCalendars.forEach((calendar) => {
      const visible = calendarVisibility[calendar.id] !== false;
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `cal-calendar-chip${visible ? ' active' : ''}`;
      chip.setAttribute('aria-pressed', String(visible));
      chip.setAttribute('aria-label', `${visible ? 'Hide' : 'Show'} ${calendar.summary}`);
      const swatch = document.createElement('span');
      swatch.className = 'cal-chip-swatch';
      if (/^#[0-9a-f]{6}$/i.test(calendar.backgroundColor || '')) {
        swatch.style.backgroundColor = calendar.backgroundColor;
      }
      const label = document.createElement('span');
      label.textContent = calendar.summary || calendar.id;
      chip.append(swatch, label);
      chip.addEventListener('click', () => {
        calendarVisibility[calendar.id] = !visible;
        localStorage.setItem(GOOGLE_VISIBILITY_KEY, JSON.stringify(calendarVisibility));
        renderCalendarsBar();
        renderEventFeed();
      });
      googleCalendarsList.appendChild(chip);
    });
  };

  // ─── Event preview dialog ─────────────────────────────────────────────────
  const showEventPreview = (event) => {
    const date = parseDateKey(event.date);
    eventPreviewTitle.textContent = event.title || '(No title)';
    eventPreviewDateTime.textContent = `${date.toLocaleDateString(undefined, {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    })} · ${formatDisplayTime(event.time)} – ${formatDisplayTime(event.endTime)}`;
    eventPreviewCalendar.textContent = eventCalendarName(event);
    eventPreviewModal.showModal();
  };

  // ─── Event card builder ──────────────────────────────────────────────────
  const createEventCard = (ev) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'cal-event-card';
    card.setAttribute('aria-label', `${ev.title}, ${formatDisplayTime(ev.time)}`);

    const accentStyle = eventAccentStyle(ev);
    const accent = document.createElement('span');
    accent.className = 'cal-event-accent';
    if (accentStyle) accent.style.cssText = accentStyle;

    const timeEl = document.createElement('span');
    timeEl.className = 'cal-event-time';
    timeEl.textContent = `${formatDisplayTime(ev.time)} – ${formatDisplayTime(ev.endTime)}`;

    const titleEl = document.createElement('span');
    titleEl.className = 'cal-event-title';
    titleEl.textContent = ev.title || '(No title)';

    const calName = document.createElement('span');
    calName.className = 'cal-event-calname';
    calName.textContent = eventCalendarName(ev);

    card.append(accent, timeEl, titleEl, calName);
    card.addEventListener('click', () => showEventPreview(ev));
    return card;
  };

  // ─── Event feed ───────────────────────────────────────────────────────────
  const renderEventFeed = () => {
    // Build range: today → today + DAYS_AHEAD
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = toDateKey(today);
    const rangeEnd = new Date(today);
    rangeEnd.setDate(rangeEnd.getDate() + DAYS_AHEAD);
    const rangeEndKey = toDateKey(rangeEnd);

    // Clear feed
    calEventFeed.innerHTML = '';

    const visibleEvents = events.filter((ev) => isCalendarVisible(ev));

    if (totalEventsCount) {
      const activeCount = visibleEvents.filter((ev) => ev.date >= todayKey && ev.date <= rangeEndKey).length;
      totalEventsCount.textContent = `${activeCount} event${activeCount !== 1 ? 's' : ''}`;
    }

    // 1. Always show Today's events card at top
    const todayEvents = visibleEvents
      .filter((ev) => ev.date === todayKey)
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

    const todayGroup = document.createElement('div');
    todayGroup.className = 'cal-day-group cal-day-group--today';

    const todayHeader = document.createElement('div');
    todayHeader.className = 'cal-day-header cal-day-header--today';

    const todayLabel = document.createElement('span');
    todayLabel.className = 'cal-day-label';
    todayLabel.textContent = 'Events for today';

    const todayCount = document.createElement('span');
    todayCount.className = 'cal-day-count';
    todayCount.textContent = `${todayEvents.length} event${todayEvents.length !== 1 ? 's' : ''}`;

    todayHeader.append(todayLabel, todayCount);
    todayGroup.appendChild(todayHeader);

    const todayList = document.createElement('div');
    todayList.className = 'cal-day-events';

    if (todayEvents.length > 0) {
      todayEvents.forEach((ev) => todayList.appendChild(createEventCard(ev)));
    } else {
      const emptyToday = document.createElement('p');
      emptyToday.className = 'cal-day-empty-hint';
      emptyToday.textContent = 'No events scheduled for today.';
      todayList.appendChild(emptyToday);
    }
    todayGroup.appendChild(todayList);
    calEventFeed.appendChild(todayGroup);

    // 2. Upcoming events (Tomorrow -> today + DAYS_AHEAD)
    const upcomingEvents = visibleEvents
      .filter((ev) => ev.date > todayKey && ev.date <= rangeEndKey)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''));

    if (upcomingEvents.length > 0) {
      const byDate = {};
      upcomingEvents.forEach((ev) => {
        if (!byDate[ev.date]) byDate[ev.date] = [];
        byDate[ev.date].push(ev);
      });

      Object.entries(byDate).forEach(([dateKey, dayEvents]) => {
        const group = document.createElement('div');
        group.className = 'cal-day-group';

        const dateHeader = document.createElement('div');
        dateHeader.className = 'cal-day-header';

        const labelSpan = document.createElement('span');
        labelSpan.className = 'cal-day-label';
        labelSpan.textContent = friendlyDateLabel(dateKey);

        const countBadge = document.createElement('span');
        countBadge.className = 'cal-day-count';
        countBadge.textContent = `${dayEvents.length} event${dayEvents.length !== 1 ? 's' : ''}`;

        dateHeader.append(labelSpan, countBadge);
        group.appendChild(dateHeader);

        const list = document.createElement('div');
        list.className = 'cal-day-events';
        dayEvents.forEach((ev) => list.appendChild(createEventCard(ev)));
        group.appendChild(list);

        calEventFeed.appendChild(group);
      });
    } else {
      const emptyUpcoming = document.createElement('p');
      emptyUpcoming.className = 'cal-empty-state';
      emptyUpcoming.textContent = 'No upcoming events in the next 30 days. Import a calendar (.ics) or connect Google Calendar to sync.';
      calEventFeed.appendChild(emptyUpcoming);
    }

    // 3. Past events (if any) in a collapsed accordion
    const pastEvents = visibleEvents
      .filter((ev) => ev.date < todayKey)
      .sort((a, b) => b.date.localeCompare(a.date) || (b.time || '').localeCompare(a.time || ''));

    if (pastEvents.length > 0) {
      const details = document.createElement('details');
      details.className = 'completed-tasks-dropdown cal-past-dropdown';
      const summary = document.createElement('summary');
      summary.textContent = `Past events (${pastEvents.length})`;
      details.appendChild(summary);

      const pastList = document.createElement('div');
      pastList.className = 'cal-day-events';
      pastList.style.marginTop = '10px';
      pastEvents.slice(0, 20).forEach((ev) => pastList.appendChild(createEventCard(ev)));
      details.appendChild(pastList);
      calEventFeed.appendChild(details);
    }
  };

  // ─── ICS import ───────────────────────────────────────────────────────────
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

  importIcsBtn.addEventListener('click', () => icsImportInput.click());

  icsImportInput.addEventListener('change', async () => {
    const file = icsImportInput.files && icsImportInput.files[0];
    if (!file) return;
    const text = await file.text();
    const added = importIcsText(text);
    setSyncStatus(`Imported ${added} event${added === 1 ? '' : 's'} from ${file.name}.`);
    icsImportInput.value = '';
    renderEventFeed();
  });

  // ─── Google Calendar sync ─────────────────────────────────────────────────
  const mergeGoogleEvents = (items, calendar) => {
    let added = 0;
    let updated = 0;
    items.forEach((item) => {
      if (item.status === 'cancelled') return;
      const startRaw = item.start?.dateTime || item.start?.date;
      if (!startRaw) return;
      const start = item.start?.dateTime
        ? { date: toDateKey(new Date(item.start.dateTime)), time: timeFromMinutes(new Date(item.start.dateTime).getHours() * 60 + new Date(item.start.dateTime).getMinutes()) }
        : { date: startRaw, time: '00:00' };
      const endDt = item.end?.dateTime;
      const end = endDt
        ? { date: toDateKey(new Date(endDt)), time: timeFromMinutes(new Date(endDt).getHours() * 60 + new Date(endDt).getMinutes()) }
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
      .filter((c) => !c.deleted)
      .map((c) => ({
        id: c.id,
        summary: c.summary || c.id,
        backgroundColor: c.backgroundColor || '',
        foregroundColor: c.foregroundColor || '',
        accessRole: c.accessRole || '',
        canWrite: ['owner', 'writer'].includes(c.accessRole),
        selected: c.selected !== false
      }));
    googleCalendars.forEach((c) => {
      if (!Object.prototype.hasOwnProperty.call(calendarVisibility, c.id)) {
        calendarVisibility[c.id] = c.selected;
      }
    });
    localStorage.setItem(GOOGLE_CALENDARS_KEY, JSON.stringify(googleCalendars));
    localStorage.setItem(GOOGLE_VISIBILITY_KEY, JSON.stringify(calendarVisibility));
    renderCalendarsBar();

    const from = new Date();
    from.setDate(from.getDate() - 1);
    const to = new Date();
    to.setDate(to.getDate() + DAYS_AHEAD + 1);
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
          setSyncStatus('Loading your Google Calendars and events…');
          try {
            const { added, updated, unavailable } = await pullGoogleEvents(resp.access_token);
            const warn = unavailable ? ` ${unavailable} calendar${unavailable === 1 ? '' : 's'} could not be read.` : '';
            setSyncStatus(`Synced: ${added} new, ${updated} updated.${warn}`);
            renderEventFeed();
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

  // ─── Event preview close ──────────────────────────────────────────────────
  closeEventPreviewBtn.addEventListener('click', () => eventPreviewModal.close());
  closeEventPreviewIcon.addEventListener('click', () => eventPreviewModal.close());

  // ─── Initial render ───────────────────────────────────────────────────────
  renderCalendarsBar();
  renderEventFeed();
});
