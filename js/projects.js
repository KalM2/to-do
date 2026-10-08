// Projects: click into a project for Kanban + Eisenhower Matrix
document.addEventListener('DOMContentLoaded', () => {
  const deleteSVG = `<svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg>`;

  const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
  };

  const quadFromPriority = (priority) => {
    if (priority === 'High') return 'ui';
    if (priority === 'Low') return 'n';
    return 'i';
  };

  let boardMode = 'kanban';
  let activeProjectId = null;
  let targetKanbanColumn = 'todo';
  let selectedCardPriority = 'Medium';
  let selectedCardQuad = 'ui';
  let selectedProjectColor = 'navy';

  const projectCardsView = document.getElementById('projectCardsView');
  const projectDetailView = document.getElementById('projectDetailView');
  const projectCardsGrid = document.getElementById('projectCardsGrid');
  const kanbanBoardView = document.getElementById('kanbanBoardView');
  const matrixView = document.getElementById('matrixView');
  const backToProjectsBtn = document.getElementById('backToProjectsBtn');
  const projectBoardToggle = document.getElementById('projectBoardToggle');
  const btnKanbanView = document.getElementById('btnKanbanView');
  const btnMatrixView = document.getElementById('btnMatrixView');
  const openNewProjectModalBtn = document.getElementById('openNewProjectModalBtn');
  const projectsPageTitle = document.getElementById('projectsPageTitle');
  const projectsPageSubtitle = document.getElementById('projectsPageSubtitle');

  const newProjectModal = document.getElementById('newProjectModal');
  const newProjectForm = document.getElementById('newProjectForm');
  const projectTitleInput = document.getElementById('projectTitleInput');
  const projectDescInput = document.getElementById('projectDescInput');
  const projectDueDateInput = document.getElementById('projectDueDateInput');
  const projectColorPills = document.getElementById('projectColorPills');
  const closeProjectModalBtn = document.getElementById('closeProjectModalBtn');

  const kanbanTaskModal = document.getElementById('kanbanTaskModal');
  const kanbanTaskForm = document.getElementById('kanbanTaskForm');
  const cardTitleInput = document.getElementById('cardTitleInput');
  const cardPriorityPills = document.getElementById('cardPriorityPills');
  const cardQuadPills = document.getElementById('cardQuadPills');
  const closeCardModalBtn = document.getElementById('closeCardModalBtn');

  const loadProjects = () => {
    const raw = localStorage.getItem('simpleDay_projects_data');
    if (raw !== null) {
      SimpleDayDefaults.markInitialized('projects');
      try { return JSON.parse(raw); } catch (e) { return []; }
    }
    if (!SimpleDayDefaults.shouldSeed('projects')) return [];
    const defaultProjects = [
      {
        id: 'proj-1',
        title: 'Simple Day Web Suite',
        desc: 'Build an elegant, all-in-one minimal productivity application with planner, calendar, and habit trackers.',
        dueDate: '2026-10-15',
        color: 'orange',
        milestones: [
          { id: 'm-1', text: 'Refactor home task engine & storage', completed: true },
          { id: 'm-2', text: 'Implement Daily Planner & Pomodoro', completed: true },
          { id: 'm-3', text: 'Build interactive Calendar & Agenda', completed: true },
          { id: 'm-4', text: 'Create Projects & Habits trackers', completed: false }
        ]
      },
      {
        id: 'proj-2',
        title: 'Quarterly Knowledge Base',
        desc: 'Consolidate reading notes, documentation archives, and weekly architectural reviews.',
        dueDate: '2026-10-30',
        color: 'navy',
        milestones: [
          { id: 'm-5', text: 'Curate design system specifications', completed: true },
          { id: 'm-6', text: 'Archive sprint retrospective learnings', completed: false }
        ]
      }
    ];
    localStorage.setItem('simpleDay_projects_data', JSON.stringify(defaultProjects));
    SimpleDayDefaults.markInitialized('projects');
    return defaultProjects;
  };

  const saveProjects = (data) => {
    localStorage.setItem('simpleDay_projects_data', JSON.stringify(data));
  };

  const loadKanban = () => {
    const raw = localStorage.getItem('simpleDay_kanban_cards');
    if (raw !== null) {
      SimpleDayDefaults.markInitialized('kanban_cards');
      try {
        return JSON.parse(raw).map((c) => ({
          ...c,
          projectId: c.projectId || '',
          eisenhower: c.eisenhower || quadFromPriority(c.priority),
          focusSeconds: c.focusSeconds || 0
        }));
      } catch (e) {
        return [];
      }
    }
    if (!SimpleDayDefaults.shouldSeed('kanban_cards')) return [];
    const defaultCards = [
      { id: 'c-1', title: 'Audit navigation links & accessibility', column: 'todo', project: 'Simple Day Web Suite', projectId: 'proj-1', priority: 'High', eisenhower: 'ui', focusSeconds: 0 },
      { id: 'c-2', title: 'Polish responsive layout & styling', column: 'in-progress', project: 'Simple Day Web Suite', projectId: 'proj-1', priority: 'Medium', eisenhower: 'i', focusSeconds: 0 },
      { id: 'c-3', title: 'Verify localStorage persistence edge cases', column: 'review', project: 'Simple Day Web Suite', projectId: 'proj-1', priority: 'High', eisenhower: 'ui', focusSeconds: 0 },
      { id: 'c-4', title: 'Design Fraunces & Tangerine font theme', column: 'done', project: 'Simple Day Web Suite', projectId: 'proj-1', priority: 'Low', eisenhower: 'n', focusSeconds: 0 }
    ];
    localStorage.setItem('simpleDay_kanban_cards', JSON.stringify(defaultCards));
    SimpleDayDefaults.markInitialized('kanban_cards');
    return defaultCards;
  };

  const saveKanban = (data) => {
    localStorage.setItem('simpleDay_kanban_cards', JSON.stringify(data));
  };

  let projects = loadProjects();
  let kanbanCards = loadKanban();

  const activeProject = () => projects.find((p) => p.id === activeProjectId) || null;

  const projectCards = () => {
    const proj = activeProject();
    if (!proj) return [];
    return kanbanCards.filter((c) => c.projectId === proj.id || (!c.projectId && c.project === proj.title));
  };

  const formatFocus = (seconds) => {
    const s = seconds || 0;
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h > 0) return `${h}h ${m}m focused`;
    if (m > 0) return `${m}m focused`;
    return '';
  };

  const createCardEl = (card) => {
    const item = document.createElement('div');
    item.className = 'kanban-card';
    item.draggable = true;
    item.dataset.id = card.id;
    const prioClass = `prio-${(card.priority || 'medium').toLowerCase()}`;
    const focusLabel = formatFocus(card.focusSeconds);
    item.innerHTML = `
      <div class="kanban-card-top">
        <span class="kanban-project-tag">${escapeHtml(card.priority || 'Medium')}</span>
        <button type="button" class="action-btn del-btn" title="Delete card">${deleteSVG}</button>
      </div>
      <p class="kanban-card-title">${escapeHtml(card.title)}</p>
      <div class="kanban-card-bottom">
        <span class="slot-badge ${prioClass}">${escapeHtml(card.priority || 'Medium')}</span>
        ${focusLabel ? `<span class="focus-chip">${escapeHtml(focusLabel)}</span>` : ''}
      </div>
    `;
    item.addEventListener('dragstart', (e) => {
      item.classList.add('dragging');
      e.dataTransfer.setData('text/plain', card.id);
    });
    item.addEventListener('dragend', () => item.classList.remove('dragging'));
    item.querySelector('.del-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      kanbanCards = kanbanCards.filter((c) => c.id !== card.id);
      saveKanban(kanbanCards);
      renderBoards();
    });
    return item;
  };

  const renderKanban = () => {
    const columns = ['todo', 'in-progress', 'review', 'done'];
    const cards = projectCards();
    columns.forEach((col) => {
      const listEl = document.querySelector(`.kanban-cards-list[data-column="${col}"]`);
      const countEl = document.getElementById(`count-${col}`);
      const cardsInCol = cards.filter((c) => c.column === col);
      if (countEl) countEl.textContent = cardsInCol.length;
      if (!listEl) return;
      listEl.innerHTML = '';
      cardsInCol.forEach((card) => listEl.appendChild(createCardEl(card)));
    });
  };

  const renderMatrix = () => {
    const cards = projectCards();
    ['ui', 'i', 'u', 'n'].forEach((quad) => {
      const listEl = document.querySelector(`.matrix-list[data-quad="${quad}"]`);
      if (!listEl) return;
      listEl.innerHTML = '';
      cards.filter((c) => (c.eisenhower || 'n') === quad).forEach((card) => {
        listEl.appendChild(createCardEl(card));
      });
    });
  };

  const renderBoards = () => {
    renderKanban();
    renderMatrix();
  };

  const showList = () => {
    activeProjectId = null;
    projectCardsView.classList.remove('hidden');
    projectDetailView.classList.add('hidden');
    backToProjectsBtn.classList.add('hidden');
    projectBoardToggle.classList.add('hidden');
    openNewProjectModalBtn.classList.remove('hidden');
    projectsPageTitle.textContent = 'Projects & Workspaces';
    projectsPageSubtitle.textContent = 'Open a project for its Kanban board and Eisenhower Matrix';
    history.replaceState(null, '', location.pathname);
    renderProjectCards();
  };

  const openProject = (id) => {
    const proj = projects.find((p) => p.id === id);
    if (!proj) return;
    activeProjectId = id;
    projectCardsView.classList.add('hidden');
    projectDetailView.classList.remove('hidden');
    backToProjectsBtn.classList.remove('hidden');
    projectBoardToggle.classList.remove('hidden');
    openNewProjectModalBtn.classList.add('hidden');
    projectsPageTitle.textContent = proj.title;
    projectsPageSubtitle.textContent = proj.desc || 'Kanban and Eisenhower Matrix for this project';
    history.replaceState(null, '', `?project=${encodeURIComponent(id)}`);
    renderBoards();
  };

  const renderProjectCards = () => {
    projectCardsGrid.innerHTML = '';
    if (projects.length === 0) {
      projectCardsGrid.innerHTML = `<p class="empty-state">No projects yet. Click "+ New Project" to get started!</p>`;
      return;
    }

    projects.forEach((proj) => {
      const card = document.createElement('div');
      card.className = `project-card color-theme-${proj.color || 'navy'} project-card-clickable`;
      const related = kanbanCards.filter((c) => c.projectId === proj.id || (!c.projectId && c.project === proj.title));
      const done = related.filter((c) => c.column === 'done').length;
      const total = related.length;
      const pct = total === 0 ? 0 : Math.round((done / total) * 100);
      const focusSecs = related.reduce((sum, c) => sum + (c.focusSeconds || 0), 0);

      card.innerHTML = `
        <div class="project-card-header">
          <div>
            <h3 class="project-card-title">${escapeHtml(proj.title)}</h3>
            ${proj.dueDate ? `<span class="project-due-date">Due: ${escapeHtml(proj.dueDate)}</span>` : ''}
          </div>
          <button type="button" class="action-btn del-project-btn" title="Delete Project">${deleteSVG}</button>
        </div>
        <p class="project-desc">${escapeHtml(proj.desc || '')}</p>
        <div class="project-progress-container">
          <div class="project-progress-meta">
            <span>Tasks (${done}/${total})</span>
            <span class="progress-pct">${pct}%</span>
          </div>
          <div class="stats-bar-track">
            <div class="stats-bar-fill" style="width: ${pct}%;"></div>
          </div>
        </div>
        <p class="project-open-hint">${total} tasks · ${formatFocus(focusSecs) || 'No focus time yet'} · Open board →</p>
      `;

      card.addEventListener('click', (e) => {
        if (e.target.closest('.del-project-btn')) return;
        openProject(proj.id);
      });

      card.querySelector('.del-project-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Delete project "${proj.title}"?`)) {
          projects = projects.filter((p) => p.id !== proj.id);
          kanbanCards = kanbanCards.filter((c) => c.projectId !== proj.id && c.project !== proj.title);
          saveProjects(projects);
          saveKanban(kanbanCards);
          renderProjectCards();
        }
      });

      projectCardsGrid.appendChild(card);
    });
  };

  backToProjectsBtn.addEventListener('click', showList);

  btnKanbanView.addEventListener('click', () => {
    boardMode = 'kanban';
    btnKanbanView.classList.add('active');
    btnMatrixView.classList.remove('active');
    kanbanBoardView.classList.remove('hidden');
    matrixView.classList.add('hidden');
  });

  btnMatrixView.addEventListener('click', () => {
    boardMode = 'matrix';
    btnMatrixView.classList.add('active');
    btnKanbanView.classList.remove('active');
    matrixView.classList.remove('hidden');
    kanbanBoardView.classList.add('hidden');
    renderMatrix();
  });

  document.querySelectorAll('.kanban-cards-list[data-column]').forEach((list) => {
    list.addEventListener('dragover', (e) => {
      e.preventDefault();
      list.classList.add('drag-over');
    });
    list.addEventListener('dragleave', () => list.classList.remove('drag-over'));
    list.addEventListener('drop', (e) => {
      e.preventDefault();
      list.classList.remove('drag-over');
      const cardId = e.dataTransfer.getData('text/plain');
      const targetCard = kanbanCards.find((c) => c.id === cardId);
      if (targetCard) {
        targetCard.column = list.dataset.column;
        saveKanban(kanbanCards);
        renderBoards();
      }
    });
  });

  document.querySelectorAll('.matrix-list').forEach((list) => {
    list.addEventListener('dragover', (e) => {
      e.preventDefault();
      list.classList.add('drag-over');
    });
    list.addEventListener('dragleave', () => list.classList.remove('drag-over'));
    list.addEventListener('drop', (e) => {
      e.preventDefault();
      list.classList.remove('drag-over');
      const cardId = e.dataTransfer.getData('text/plain');
      const targetCard = kanbanCards.find((c) => c.id === cardId);
      if (targetCard) {
        targetCard.eisenhower = list.dataset.quad;
        saveKanban(kanbanCards);
        renderBoards();
      }
    });
  });

  document.querySelectorAll('.btn-add-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      targetKanbanColumn = btn.dataset.column;
      cardTitleInput.value = '';
      kanbanTaskModal.showModal();
      cardTitleInput.focus();
    });
  });

  cardPriorityPills.querySelectorAll('.pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      cardPriorityPills.querySelectorAll('.pill').forEach((p) => p.classList.remove('selected'));
      pill.classList.add('selected');
      selectedCardPriority = pill.dataset.prio;
    });
  });

  cardQuadPills.querySelectorAll('.pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      cardQuadPills.querySelectorAll('.pill').forEach((p) => p.classList.remove('selected'));
      pill.classList.add('selected');
      selectedCardQuad = pill.dataset.quad;
    });
  });

  kanbanTaskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = cardTitleInput.value.trim();
    const proj = activeProject();
    if (!title || !proj) return;
    kanbanCards.push({
      id: 'c-' + Date.now(),
      title,
      column: targetKanbanColumn,
      project: proj.title,
      projectId: proj.id,
      priority: selectedCardPriority,
      eisenhower: selectedCardQuad,
      focusSeconds: 0
    });
    saveKanban(kanbanCards);
    kanbanTaskModal.close();
    renderBoards();
  });

  closeCardModalBtn.addEventListener('click', () => kanbanTaskModal.close());

  projectColorPills.querySelectorAll('.pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      projectColorPills.querySelectorAll('.pill').forEach((p) => p.classList.remove('selected'));
      pill.classList.add('selected');
      selectedProjectColor = pill.dataset.color;
    });
  });

  openNewProjectModalBtn.addEventListener('click', () => {
    projectTitleInput.value = '';
    projectDescInput.value = '';
    projectDueDateInput.value = '';
    newProjectModal.showModal();
    projectTitleInput.focus();
  });

  closeProjectModalBtn.addEventListener('click', () => newProjectModal.close());

  newProjectForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = projectTitleInput.value.trim();
    if (!title) return;
    const newProj = {
      id: 'proj-' + Date.now(),
      title,
      desc: projectDescInput.value.trim(),
      dueDate: projectDueDateInput.value || '',
      color: selectedProjectColor,
      milestones: []
    };
    projects.push(newProj);
    saveProjects(projects);
    newProjectModal.close();
    renderProjectCards();
  });

  renderProjectCards();
  const params = new URLSearchParams(location.search);
  const fromQuery = params.get('project');
  if (fromQuery) openProject(fromQuery);
});
