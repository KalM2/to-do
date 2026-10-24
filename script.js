(async () => {
  await window.SimpleDayCloud.ready;
  if (window.SimpleDayCloud.configured && !window.SimpleDayCloud.user) return;
  await window.SimpleDayDB.ready;

  // * DOM Elements
  const taskInput = document.getElementById('AddTasksInput');
  const addTaskBtn = document.getElementById('AddTaskBtn');
  const taskSectionSelect = document.getElementById('taskSectionSelect');
  const sectionsContainer = document.getElementById('sectionsContainer');
  const addSectionBtn = document.getElementById('addSectionBtn');
  const clearCompletedBtn = document.getElementById('clearCompletedBtn');
  const statsCountEl = document.getElementById('statsCount');
  const statsFillEl = document.getElementById('statsBarFill');
  const greetingPrefixEl = document.getElementById('greetingPrefix');
  const userNameEl = document.getElementById('userName');
  const dateDisplayEl = document.getElementById('currentDateDisplay');

  // Modals
  const newSectionModal = document.getElementById('newSectionModal');
  const newSectionForm = document.getElementById('newSectionForm');
  const newSectionNameInput = document.getElementById('newSectionNameInput');
  const cancelSectionBtn = document.getElementById('cancelSectionBtn');

  const renameSectionModal = document.getElementById('renameSectionModal');
  const renameSectionForm = document.getElementById('renameSectionForm');
  const renameSectionNameInput = document.getElementById('renameSectionNameInput');
  const cancelRenameSectionBtn = document.getElementById('cancelRenameSectionBtn');

  // * SVGs
  const deleteSVG = `<svg xmlns="http://www.w3.org/2000/svg" height="17px" viewBox="0 -960 960 960" width="17px" fill="currentColor"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg>`;
  const subtaskSVG = `<svg xmlns="http://www.w3.org/2000/svg" height="17px" viewBox="0 -960 960 960" width="17px" fill="currentColor"><path d="m560-120-57-57 144-143H200v-480h80v400h367L503-544l56-57 241 241-240 240Z"/></svg>`;
  const editSVG = `<svg xmlns="http://www.w3.org/2000/svg" height="17px" viewBox="0 -960 960 960" width="17px" fill="currentColor"><path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/></svg>`;
  const dragHandleSVG = `<svg viewBox="0 0 24 24" width="15px" height="15px" fill="currentColor"><circle cx="9" cy="6" r="1.4"/><circle cx="15" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="18" r="1.4"/></svg>`;

  // Helper: Escape HTML
  const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  };

  // * State
  let sections = [];
  let tasks = [];
  let activeSectionId = '';
  let sectionToRenameId = null;
  let draggedTaskId = null;

  // * Load Sections
  const loadSections = () => {
    const raw = localStorage.getItem('simpleDay_sections');
    if (raw !== null) {
      SimpleDayDefaults.markInitialized('sections');
      try {
        sections = JSON.parse(raw);
      } catch (e) {
        console.error('Failed to parse saved sections', e);
        sections = [];
      }
    }

    if (!Array.isArray(sections) || sections.length === 0) {
      sections = [
        { id: 'sec-my-tasks', name: 'My Tasks' },
        { id: 'sec-personal', name: 'Personal' }
      ];
      localStorage.setItem('simpleDay_sections', JSON.stringify(sections));
      SimpleDayDefaults.markInitialized('sections');
    }

    if (!activeSectionId || !sections.some(s => s.id === activeSectionId)) {
      activeSectionId = sections[0].id;
    }
  };

  const saveSections = () => {
    localStorage.setItem('simpleDay_sections', JSON.stringify(sections));
  };

  // * Load Tasks
  const loadTasks = () => {
    const raw = localStorage.getItem('simpleDay_tasks');
    let taskData = [];
    if (raw !== null) {
      SimpleDayDefaults.markInitialized('tasks');
      try {
        taskData = JSON.parse(raw);
      } catch (e) {
        console.error('Failed to parse saved tasks', e);
        taskData = [];
      }
      if (!Array.isArray(taskData)) taskData = [];
    } else if (SimpleDayDefaults.shouldSeed('tasks')) {
      taskData = [
        {
          id: 'task-1',
          text: "Welcome to your Google Tasks style day",
          completed: false,
          sectionId: "sec-my-tasks",
          subtasks: [
            { id: 'sub-1', text: "Click the circular checkbox to complete", completed: true },
            { id: 'sub-2', text: "Create custom sections with '+ Add Section'", completed: false }
          ]
        },
        {
          id: 'task-2',
          text: "Drag and drop tasks between sections to organize",
          completed: false,
          sectionId: "sec-my-tasks",
          subtasks: []
        },
        {
          id: 'task-3',
          text: "Daily reflection and wind down",
          completed: false,
          sectionId: "sec-personal",
          subtasks: []
        }
      ];
      localStorage.setItem('simpleDay_tasks', JSON.stringify(taskData));
      SimpleDayDefaults.markInitialized('tasks');
    }

    // Migration for legacy tasks that had listId instead of sectionId
    const fallbackSectionId = sections[0]?.id || 'sec-my-tasks';
    tasks = taskData.map((item, idx) => {
      let targetSection = item.sectionId;
      if (!targetSection) {
        targetSection = fallbackSectionId;
      }
      return {
        id: item.id || ('task-' + idx + '-' + Date.now()),
        text: item.text || '',
        completed: Boolean(item.completed),
        sectionId: targetSection,
        subtasks: Array.isArray(item.subtasks) ? item.subtasks.map((st, sIdx) => ({
          id: st.id || ('sub-' + idx + '-' + sIdx),
          text: st.text || '',
          completed: Boolean(st.completed)
        })) : []
      };
    });

    saveTasks();
  };

  const saveTasks = () => {
    localStorage.setItem('simpleDay_tasks', JSON.stringify(tasks));
    updateStats();
  };

  // * Update Stats
  const updateStats = () => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;

    if (statsCountEl) {
      statsCountEl.textContent = `${completed} of ${total} completed`;
    }
    if (statsFillEl) {
      const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
      statsFillEl.style.width = `${pct}%`;
    }
  };

  // * Create Subtask Element
  const createSubtaskDOM = (parentTask, subtask) => {
    const div = document.createElement('div');
    div.className = 'subtask-item' + (subtask.completed ? ' completed' : '');
    div.innerHTML = `
      <input type="checkbox" class="subtask-cb" ${subtask.completed ? 'checked' : ''} aria-label="Mark subtask completed">
      <span class="subtask-text">${escapeHtml(subtask.text)}</span>
      <div class="task-actions">
        <button type="button" class="action-btn sub-del-btn" title="Delete subtask">${deleteSVG}</button>
      </div>
    `;

    const cb = div.querySelector('.subtask-cb');
    cb.addEventListener('change', () => {
      subtask.completed = cb.checked;
      div.classList.toggle('completed', cb.checked);
      saveTasks();
    });

    div.querySelector('.sub-del-btn').addEventListener('click', () => {
      parentTask.subtasks = parentTask.subtasks.filter(st => st.id !== subtask.id);
      saveTasks();
      renderApp();
    });

    return div;
  };

  // * Create Task Element (Google Tasks Style)
  const createTaskDOM = (task) => {
    const container = document.createElement('div');
    container.className = 'task-container' + (task.completed ? ' completed' : '');
    container.draggable = true;
    container.dataset.taskId = task.id;
    container.dataset.sectionId = task.sectionId;

    container.innerHTML = `
      <div class="task-item">
        <span class="drag-handle" title="Drag to reorder" aria-label="Drag task">
          ${dragHandleSVG}
        </span>
        <input type="checkbox" class="google-cb" ${task.completed ? 'checked' : ''} aria-label="Mark task completed">
        <span class="task-text" title="Double click to edit">${escapeHtml(task.text)}</span>
        <div class="task-actions">
          <button type="button" class="action-btn sub-btn" title="Add subtask">${subtaskSVG}</button>
          <button type="button" class="action-btn edit-btn" title="Edit task">${editSVG}</button>
          <button type="button" class="action-btn del-btn" title="Delete task">${deleteSVG}</button>
        </div>
      </div>
      <div class="subtask-list"></div>
      <input type="text" class="subtask-input" placeholder="Type subtask and press Enter...">
    `;

    const mainCb = container.querySelector('.google-cb');
    const taskSpan = container.querySelector('.task-text');
    const editBtn = container.querySelector('.edit-btn');
    const subBtn = container.querySelector('.sub-btn');
    const delBtn = container.querySelector('.del-btn');
    const subList = container.querySelector('.subtask-list');
    const subInput = container.querySelector('.subtask-input');

    // Populate subtasks
    if (task.subtasks && task.subtasks.length > 0) {
      task.subtasks.forEach(st => {
        subList.appendChild(createSubtaskDOM(task, st));
      });
    }

    // Toggle Task Complete
    mainCb.addEventListener('change', () => {
      task.completed = mainCb.checked;
      container.classList.toggle('completed', task.completed);
      saveTasks();
      renderApp();
    });

    // Inline Task Editing
    const startEditing = () => {
      const currentText = task.text;
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'inline-edit-input';
      input.value = currentText;
      taskSpan.replaceWith(input);
      input.focus();
      input.select();

      let finished = false;
      const finishEditing = () => {
        if (finished) return;
        finished = true;
        const newText = input.value.trim() || currentText;
        task.text = newText;
        taskSpan.textContent = newText;
        if (input.parentElement) {
          input.replaceWith(taskSpan);
        }
        saveTasks();
      };

      input.addEventListener('blur', finishEditing);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') finishEditing();
        if (e.key === 'Escape') {
          finished = true;
          if (input.parentElement) input.replaceWith(taskSpan);
        }
      });
    };

    taskSpan.addEventListener('dblclick', startEditing);
    editBtn.addEventListener('click', startEditing);

    // Subtask input toggle
    subBtn.addEventListener('click', () => {
      const isVisible = subInput.style.display === 'block';
      subInput.style.display = isVisible ? 'none' : 'block';
      if (!isVisible) subInput.focus();
    });

    subInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = subInput.value.trim();
        if (val) {
          const newSub = {
            id: 'sub-' + Date.now(),
            text: val,
            completed: false
          };
          task.subtasks.push(newSub);
          subList.appendChild(createSubtaskDOM(task, newSub));
          subInput.value = '';
          subInput.focus();
          saveTasks();
        } else {
          subInput.style.display = 'none';
        }
      } else if (e.key === 'Escape') {
        subInput.style.display = 'none';
      }
    });

    // Delete Task
    delBtn.addEventListener('click', () => {
      tasks = tasks.filter(t => t.id !== task.id);
      saveTasks();
      renderApp();
    });

    // Drag Setup
    container.addEventListener('dragstart', (e) => {
      draggedTaskId = task.id;
      container.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', task.id);
      e.stopPropagation();
    });

    container.addEventListener('dragend', () => {
      container.classList.remove('dragging');
      document.querySelectorAll('.task-container').forEach(c => c.classList.remove('drag-over-top', 'drag-over-bottom'));
      draggedTaskId = null;
    });

    // Drag over another task for reordering
    container.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!draggedTaskId || draggedTaskId === task.id) return;

      const rect = container.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const isTop = e.clientY < midY;
      container.classList.toggle('drag-over-top', isTop);
      container.classList.toggle('drag-over-bottom', !isTop);
    });

    container.addEventListener('dragleave', () => {
      container.classList.remove('drag-over-top', 'drag-over-bottom');
    });

    container.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      container.classList.remove('drag-over-top', 'drag-over-bottom');
      if (!draggedTaskId || draggedTaskId === task.id) return;

      const draggedIndex = tasks.findIndex(t => t.id === draggedTaskId);
      const targetIndex = tasks.findIndex(t => t.id === task.id);
      if (draggedIndex === -1 || targetIndex === -1) return;

      const [movedTask] = tasks.splice(draggedIndex, 1);
      movedTask.sectionId = task.sectionId;

      const rect = container.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const insertBefore = e.clientY < midY;

      let newIdx = tasks.findIndex(t => t.id === task.id);
      if (!insertBefore) newIdx++;
      tasks.splice(newIdx, 0, movedTask);

      saveTasks();
      renderApp();
    });

    return container;
  };

  // * Render Entire App
  const renderApp = () => {
    // 1. Populate Section Selector
    if (taskSectionSelect) {
      taskSectionSelect.innerHTML = '';
      sections.forEach(sec => {
        const opt = document.createElement('option');
        opt.value = sec.id;
        opt.textContent = sec.name;
        if (sec.id === activeSectionId) opt.selected = true;
        taskSectionSelect.appendChild(opt);
      });
    }

    // 2. Render Sections
    if (sectionsContainer) {
      sectionsContainer.innerHTML = '';

      sections.forEach(sec => {
        const secTasks = tasks.filter(t => t.sectionId === sec.id);
        const activeTasks = secTasks.filter(t => !t.completed);
        const completedTasks = secTasks.filter(t => t.completed);

        const card = document.createElement('div');
        card.className = 'task-section-card';
        card.dataset.sectionId = sec.id;

        card.innerHTML = `
          <div class="section-header-row">
            <div class="section-title-wrap">
              <h2 class="section-title" title="Click to rename">${escapeHtml(sec.name)}</h2>
              <span class="section-count-badge">${activeTasks.length}</span>
            </div>
            <div class="section-actions">
              <button type="button" class="section-action-btn btn-add-to-section" title="Add task to ${escapeHtml(sec.name)}">+ Task</button>
              <button type="button" class="section-action-btn btn-rename" title="Rename section">✎</button>
              <button type="button" class="section-action-btn btn-delete" title="Delete section">✕</button>
            </div>
          </div>
          <div class="task-list" data-section-id="${sec.id}"></div>
        `;

        const taskListEl = card.querySelector('.task-list');

        // Active Tasks
        if (activeTasks.length === 0 && completedTasks.length === 0) {
          const empty = document.createElement('div');
          empty.className = 'section-empty-hint';
          empty.textContent = 'No tasks in this section yet. Add one above!';
          taskListEl.appendChild(empty);
        } else {
          activeTasks.forEach(t => {
            taskListEl.appendChild(createTaskDOM(t));
          });
        }

        // Completed Tasks Accordion (Google Tasks style)
        if (completedTasks.length > 0) {
          const details = document.createElement('details');
          details.className = 'completed-tasks-dropdown';
          details.innerHTML = `
            <summary>Completed (${completedTasks.length})</summary>
            <div class="completed-tasks-list"></div>
          `;
          const completedList = details.querySelector('.completed-tasks-list');
          completedTasks.forEach(t => {
            completedList.appendChild(createTaskDOM(t));
          });
          taskListEl.appendChild(details);
        }

        // Section Drag & Drop Target
        taskListEl.addEventListener('dragover', (e) => {
          e.preventDefault();
          taskListEl.classList.add('drag-over');
        });

        taskListEl.addEventListener('dragleave', () => {
          taskListEl.classList.remove('drag-over');
        });

        taskListEl.addEventListener('drop', (e) => {
          e.preventDefault();
          taskListEl.classList.remove('drag-over');
          if (!draggedTaskId) return;

          const movedTask = tasks.find(t => t.id === draggedTaskId);
          if (movedTask && movedTask.sectionId !== sec.id) {
            movedTask.sectionId = sec.id;
            saveTasks();
            renderApp();
          }
        });

        // Quick "+ Task" inside section button
        card.querySelector('.btn-add-to-section').addEventListener('click', () => {
          activeSectionId = sec.id;
          if (taskSectionSelect) taskSectionSelect.value = sec.id;
          taskInput.focus();
        });

        // Rename Section
        const triggerRename = () => {
          sectionToRenameId = sec.id;
          if (renameSectionNameInput) renameSectionNameInput.value = sec.name;
          if (renameSectionModal) {
            renameSectionModal.showModal();
            renameSectionNameInput.focus();
          }
        };

        card.querySelector('.section-title').addEventListener('click', triggerRename);
        card.querySelector('.btn-rename').addEventListener('click', triggerRename);

        // Delete Section
        card.querySelector('.btn-delete').addEventListener('click', () => {
          const taskCount = secTasks.length;
          const msg = taskCount > 0
            ? `Delete section "${sec.name}" and all ${taskCount} task(s) inside it?`
            : `Delete section "${sec.name}"?`;
          if (confirm(msg)) {
            sections = sections.filter(s => s.id !== sec.id);
            tasks = tasks.filter(t => t.sectionId !== sec.id);
            if (sections.length === 0) {
              sections = [{ id: 'sec-tasks', name: 'My Tasks' }];
            }
            if (activeSectionId === sec.id) {
              activeSectionId = sections[0].id;
            }
            saveSections();
            saveTasks();
            renderApp();
          }
        });

        sectionsContainer.appendChild(card);
      });
    }

    updateStats();
  };

  // * Add Task Handler
  const handleAddTask = () => {
    const text = taskInput.value.trim();
    if (!text) return;

    const targetSection = (taskSectionSelect && taskSectionSelect.value) || activeSectionId || sections[0]?.id;
    const newTask = {
      id: 'task-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      text,
      completed: false,
      sectionId: targetSection,
      subtasks: []
    };

    tasks.unshift(newTask);
    saveTasks();
    renderApp();

    taskInput.value = '';
    taskInput.focus();
  };

  if (taskInput) {
    taskInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleAddTask();
    });
  }

  if (addTaskBtn) {
    addTaskBtn.addEventListener('click', handleAddTask);
  }

  if (taskSectionSelect) {
    taskSectionSelect.addEventListener('change', () => {
      activeSectionId = taskSectionSelect.value;
    });
  }

  // * Clear Completed Tasks
  if (clearCompletedBtn) {
    clearCompletedBtn.addEventListener('click', () => {
      const completedCount = tasks.filter(t => t.completed).length;
      if (completedCount === 0) return;
      if (confirm(`Clear all ${completedCount} completed task(s)?`)) {
        tasks = tasks.filter(t => !t.completed);
        saveTasks();
        renderApp();
      }
    });
  }

  // * Add Section Modal Handlers
  if (addSectionBtn && newSectionModal) {
    addSectionBtn.addEventListener('click', () => {
      newSectionNameInput.value = '';
      newSectionModal.showModal();
      newSectionNameInput.focus();
    });
  }

  if (cancelSectionBtn && newSectionModal) {
    cancelSectionBtn.addEventListener('click', () => newSectionModal.close());
  }

  if (newSectionForm) {
    newSectionForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = newSectionNameInput.value.trim();
      if (!name) return;

      const newSec = {
        id: 'sec-' + Date.now(),
        name
      };

      sections.push(newSec);
      activeSectionId = newSec.id;
      saveSections();
      newSectionModal.close();
      renderApp();

      // Focus task input for the new section
      taskInput.focus();
    });
  }

  // * Rename Section Modal Handlers
  if (cancelRenameSectionBtn && renameSectionModal) {
    cancelRenameSectionBtn.addEventListener('click', () => renameSectionModal.close());
  }

  if (renameSectionForm) {
    renameSectionForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const newName = renameSectionNameInput.value.trim();
      if (!newName || !sectionToRenameId) return;

      const targetSec = sections.find(s => s.id === sectionToRenameId);
      if (targetSec) {
        targetSec.name = newName;
        saveSections();
        renameSectionModal.close();
        renderApp();
      }
    });
  }

  // * Greeting & Date
  const savedName = localStorage.getItem('simpleTracker_userName') || 'Kaleb';
  if (userNameEl) {
    userNameEl.textContent = savedName;
  }

  const updateGreetingAndDate = () => {
    const now = new Date();
    const hour = now.getHours();
    const prefix = (hour < 12) ? "Good Morning" : (hour < 18) ? "Good Afternoon" : "Good Evening";
    if (greetingPrefixEl) {
      greetingPrefixEl.textContent = prefix;
    }
    if (dateDisplayEl) {
      const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
      dateDisplayEl.textContent = now.toLocaleDateString(undefined, options);
    }
  };
  updateGreetingAndDate();

  // * Init
  loadSections();
  loadTasks();
  renderApp();
})();
