# simple day (simple-tracker)

An elegant, minimalist personal productivity suite crafted with warmth, aesthetic theme personalization, and seamless local persistence.

---

## 🎨 Theme Picker & Customization (Inspired by Omarchy)
Click the **Theme** button in the header (palette icon) to open the interactive theme strip:
* **10 Curated Aesthetic Themes**:
  1. **Warm Cream** (Default warm editorial & terracotta)
  2. **Tokyo Night** (Cyber aesthetic dark blue & neon)
  3. **Catppuccin** (Cozy mocha pastel)
  4. **Gruvbox** (Retro warm dark & gold)
  5. **Everforest** (Forest green calm dark)
  6. **Rose Pine** (Soft vintage blush light)
  7. **Matte Black** (Sleek minimalist dark)
  8. **Nordic Frost** (Clean arctic light)
  9. **Paper White** (Monochrome high contrast)
  10. **Cyberpunk Neon** (Vibrant electric glow)
* **Live Previews**: Hover over any theme to preview changes in real time.
* **Keyboard Navigation**: `←` `→` to browse themes, `Enter` to apply, and `Esc` to cancel.
* **Zero-Flicker Persistence**: Instant theme loading in `<head>` to prevent flashes of unstyled content.

---

## 👤 Account Profile & Data Management
Click the user avatar in the header to open your **Account & Data Panel**:
* **Profile Customization**: Change display name, username (`@handle`), email, and daily motto.
* **Avatar Selection**: Choose custom initials or preset aesthetic icons (☕, 🌿, 🚀, 🦊, ⚡, 🎨, 📚, 🌊).
* **Productivity Stats Overview**: Real-time counter of total tasks completed, weekly habit consistency rate, and active projects.
* **Data Portability**:
  * **Export Backup (JSON)**: Download your entire workspace (tasks, planner notes, calendar events, projects, habits, and profile) as a single backup file.
  * **Import Backup**: Restore a backup `.json` file anytime.
  * **Reset Defaults**: Start fresh whenever needed.
* **Calendar Connections**: Import ICS files or connect and sync Google Calendar from the profile panel.

---

## 🌟 Pages & Tools

### 1. 🏡 Daily Dashboard (`index.html`)
- **Time of Day vs. Priority Formats**: Toggle between time-grouped tasks (Morning, Afternoon, Evening) and Eisenhower matrices (Urgent & Important, Important, Urgent, Remaining).
- **Drag-and-Drop & Nesting**: Reorder tasks, move between lists, or nest tasks into subtasks.
- **Smart Completion**: Collapsible `<details>` grouping for completed tasks.
- **Inline Task Editing**: Double-click any task to rename it in place.
- **Completion Progress Bar**: Real-time completion tracker with a "Clear Completed" button.

### 2. 🗓️ Daily Planner (`pages/planner.html`)
- **Top 3 Daily Priorities**: Set and check off your highest-impact goals for the day.
- **Hourly Time Blocking (6 AM – 10 PM)**: Schedule blocks with category tags (*Focus*, *Meeting*, *Routine*, *Personal*, *Break*).
- **Pomodoro Focus Timer**: 25m Focus / 5m Short Break / 15m Long Break with Web Audio chime and session tracking.
- **Daily Hydration Tracker**: 8 interactive water droplets to keep track of daily hydration.
- **Scratchpad & Reflection**: Auto-saving daily notes and thoughts per date.

### 3. 📅 Calendar & Agenda (`pages/calender.html`)
- **Interactive Monthly Grid**: Clean month view with day numbers, "Today" highlight, and event tags.
- **Day Inspector**: Click any day to view and manage all scheduled events.
- **Quick Event Creation**: Add events with time, category badges (*Work*, *Personal*, *Urgent*, *Wellness*), and notes.
- **Event Details**: Select events in the day or week grid, or from Upcoming, to preview their details.
- **Upcoming Agenda**: Filter by week or month and choose which calendars appear in the list.

### 4. 🗂️ Projects & Workspaces (`pages/projects.html`)
- **Project Portfolio Cards**: Manage multi-step projects with target due dates, custom color accents, and automatic milestone progress calculation.
- **Interactive Kanban Board**: 4-column drag-and-drop workflow (*To Do*, *In Progress*, *Review*, *Completed*) with column counts and priority tags.
- **Milestone Checklist**: Track individual deliverables directly inside each project card.

### 5. 🎯 Habit Tracker (`pages/habits.html`)
- **Weekly Matrix View**: 7-day circular check-in grid (Monday to Sunday) for active habits.
- **Automatic Streak Engine**: Calculates current consecutive streaks (🔥) and long-term consistency.
- **Weekly Consistency Analytics**: Live progress bar and completion percentage based on weekly check-ins.
- **Habit Categories**: Organize habits by *Mind*, *Health*, *Fitness*, and *Productivity*.

---

## 🚀 Getting Started
Open `index.html` in any modern web browser or run a lightweight local static server:
```bash
python3 -m http.server 8000
```
Then navigate to `http://localhost:8000`.

## GitHub Pages
The workflow in `.github/workflows/pages.yml` deploys the static site from the `master` branch. The expected site URL is `https://kalm2.github.io/to-do/` after GitHub Pages is enabled with **GitHub Actions** as its source.

To enable Google Calendar on the deployed site, add `https://kalm2.github.io` to the authorized JavaScript origins for the Google OAuth client used by the app.

Tasks, profile settings, planner data, and local calendar events are stored in each browser's local storage. They do not automatically sync between devices; use the profile backup controls to transfer this data. Google Calendar events continue to sync through the connected Google account.