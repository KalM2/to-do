// Projects & Kanban Board Logic
document.addEventListener('DOMContentLoaded', () => {
  // SVGs
  const deleteSVG = `<svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg>`;

  // Helper: Escape HTML
  const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  // State
  let activeView = 'projects'; // 'projects' or 'kanban'
  let targetKanbanColumn = 'todo';
  let selectedCardPriority = 'Medium';
  let selectedProjectColor = 'navy';

  // DOM Elements
  const btnProjectsView = document.getElementById('btnProjectsView');
  const btnKanbanView = document.getElementById('btnKanbanView');
  const projectCardsView = document.getElementById('projectCardsView');
  const kanbanBoardView = document.getElementById('kanbanBoardView');
  const projectCardsGrid = document.getElementById('projectCardsGrid');

  // Modals
  const openNewProjectModalBtn = document.getElementById('openNewProjectModalBtn');
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
  const cardProjectSelect = document.getElementById('cardProjectSelect');
  const cardPriorityPills = document.getElementById('cardPriorityPills');
  const closeCardModalBtn = document.getElementById('closeCardModalBtn');

  // Load / Save Data
  const loadProjects = () => {
    const raw = localStorage.getItem('simpleDay_projects_data');
    if (raw) {
      try { return JSON.parse(raw); } catch (e) { return []; }
    }
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
    return defaultProjects;
  };

  const saveProjects = (data) => {
    localStorage.setItem('simpleDay_projects_data', JSON.stringify(data));
  };

  const loadKanban = () => {
    const raw = localStorage.getItem('simpleDay_kanban_cards');
    if (raw) {
      try { return JSON.parse(raw); } catch (e) { return []; }
    }
    const defaultCards = [
      { id: 'c-1', title: 'Audit navigation links & accessibility', column: 'todo', project: 'Simple Day Web Suite', priority: 'High' },
      { id: 'c-2', title: 'Polish responsive layout & styling', column: 'in-progress', project: 'Simple Day Web Suite', priority: 'Medium' },
      { id: 'c-3', title: 'Verify localStorage persistence edge cases', column: 'review', project: 'Simple Day Web Suite', priority: 'High' },
      { id: 'c-4', title: 'Design Fraunces & Tangerine font theme', column: 'done', project: 'Simple Day Web Suite', priority: 'Low' }
    ];
    localStorage.setItem('simpleDay_kanban_cards', JSON.stringify(defaultCards));
    return defaultCards;
  };

  const saveKanban = (data) => {
    localStorage.setItem('simpleDay_kanban_cards', JSON.stringify(data));
  };

  let projects = loadProjects();
  let kanbanCards = loadKanban();

  // View Switching
  btnProjectsView.addEventListener('click', () => {
    activeView = 'projects';
    btnProjectsView.classList.add('active');
    btnKanbanView.classList.remove('active');
    projectCardsView.classList.remove('hidden');
    kanbanBoardView.classList.add('hidden');
  });

  btnKanbanView.addEventListener('click', () => {
    activeView = 'kanban';
    btnKanbanView.classList.add('active');
    btnProjectsView.classList.remove('active');
    kanbanBoardView.classList.remove('hidden');
    projectCardsView.classList.add('hidden');
    renderKanban();
  });

  // Render Project Cards
  const renderProjectCards = () => {
    projectCardsGrid.innerHTML = '';
    if (projects.length === 0) {
      projectCardsGrid.innerHTML = `<p class="empty-state">No projects yet. Click "+ New Project" to get started!</p>`;
      return;
    }

    // Update project select options in Kanban modal
    cardProjectSelect.innerHTML = '<option value="General">General</option>';
    projects.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.title;
      opt.textContent = p.title;
      cardProjectSelect.appendChild(opt);
    });

    projects.forEach(proj => {
      const card = document.createElement('div');
      card.className = `project-card color-theme-${proj.color || 'navy'}`;

      const totalMilestones = proj.milestones.length;
      const completedMilestones = proj.milestones.filter(m => m.completed).length;
      const pct = totalMilestones === 0 ? 0 : Math.round((completedMilestones / totalMilestones) * 100);

      let milestonesHtml = '';
      proj.milestones.forEach(m => {
        milestonesHtml += `
          <div class="milestone-item ${m.completed ? 'completed' : ''}" data-mid="${m.id}">
            <input type="checkbox" class="milestone-cb" ${m.completed ? 'checked' : ''} aria-label="Mark milestone complete">
            <span class="milestone-text">${escapeHtml(m.text)}</span>
            <button type="button" class="action-btn del-milestone-btn" title="Delete Milestone">${deleteSVG}</button>
          </div>
        `;
      });

      card.innerHTML = `
        <div class="project-card-header">
          <div>
            <h3 class="project-card-title">${escapeHtml(proj.title)}</h3>
            ${proj.dueDate ? `<span class="project-due-date">Due: ${proj.dueDate}</span>` : ''}
          </div>
          <button type="button" class="action-btn del-project-btn" title="Delete Project">${deleteSVG}</button>
        </div>
        <p class="project-desc">${escapeHtml(proj.desc || '')}</p>

        <div class="project-progress-container">
          <div class="project-progress-meta">
            <span>Progress (${completedMilestones}/${totalMilestones})</span>
            <span class="progress-pct">${pct}%</span>
          </div>
          <div class="stats-bar-track">
            <div class="stats-bar-fill" style="width: ${pct}%;"></div>
          </div>
        </div>

        <div class="milestones-section">
          <p class="pill-label">Milestones</p>
          <div class="milestones-list">${milestonesHtml}</div>
          <input type="text" class="add-milestone-input" placeholder="+ Add milestone and hit Enter...">
        </div>
      `;

      // Milestone checkboxes
      card.querySelectorAll('.milestone-cb').forEach(cb => {
        cb.addEventListener('change', () => {
          const mid = cb.closest('.milestone-item').dataset.mid;
          const target = proj.milestones.find(m => m.id === mid);
          if (target) {
            target.completed = cb.checked;
            saveProjects(projects);
            renderProjectCards();
          }
        });
      });

      // Delete milestone
      card.querySelectorAll('.del-milestone-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const mid = btn.closest('.milestone-item').dataset.mid;
          proj.milestones = proj.milestones.filter(m => m.id !== mid);
          saveProjects(projects);
          renderProjectCards();
        });
      });

      // Add new milestone input
      const milestoneInput = card.querySelector('.add-milestone-input');
      milestoneInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const text = milestoneInput.value.trim();
          if (text) {
            proj.milestones.push({ id: 'm-' + Date.now(), text, completed: false });
            saveProjects(projects);
            renderProjectCards();
          }
        }
      });

      // Delete Project
      card.querySelector('.del-project-btn').addEventListener('click', () => {
        if (confirm(`Delete project "${proj.title}"?`)) {
          projects = projects.filter(p => p.id !== proj.id);
          saveProjects(projects);
          renderProjectCards();
        }
      });

      projectCardsGrid.appendChild(card);
    });
  };

  // Render Kanban Board
  const renderKanban = () => {
    const columns = ['todo', 'in-progress', 'review', 'done'];

    columns.forEach(col => {
      const listEl = document.querySelector(`.kanban-cards-list[data-column="${col}"]`);
      const countEl = document.getElementById(`count-${col}`);
      const cardsInCol = kanbanCards.filter(c => c.column === col);

      if (countEl) countEl.textContent = cardsInCol.length;
      if (!listEl) return;

      listEl.innerHTML = '';
      cardsInCol.forEach(card => {
        const item = document.createElement('div');
        item.className = 'kanban-card';
        item.draggable = true;
        item.dataset.id = card.id;

        const prioClass = `prio-${(card.priority || 'medium').toLowerCase()}`;

        item.innerHTML = `
          <div class="kanban-card-top">
            <span class="kanban-project-tag">${escapeHtml(card.project || 'General')}</span>
            <button type="button" class="action-btn del-btn" title="Delete card">${deleteSVG}</button>
          </div>
          <p class="kanban-card-title">${escapeHtml(card.title)}</p>
          <div class="kanban-card-bottom">
            <span class="slot-badge ${prioClass}">${card.priority || 'Medium'}</span>
          </div>
        `;

        item.addEventListener('dragstart', (e) => {
          item.classList.add('dragging');
          e.dataTransfer.setData('text/plain', card.id);
        });
        item.addEventListener('dragend', () => {
          item.classList.remove('dragging');
        });

        item.querySelector('.del-btn').addEventListener('click', () => {
          kanbanCards = kanbanCards.filter(c => c.id !== card.id);
          saveKanban(kanbanCards);
          renderKanban();
        });

        listEl.appendChild(item);
      });
    });
  };

  // Setup Kanban Drag & Drop
  document.querySelectorAll('.kanban-cards-list').forEach(list => {
    list.addEventListener('dragover', (e) => {
      e.preventDefault();
      list.classList.add('drag-over');
    });
    list.addEventListener('dragleave', () => list.classList.remove('drag-over'));
    list.addEventListener('drop', (e) => {
      e.preventDefault();
      list.classList.remove('drag-over');
      const cardId = e.dataTransfer.getData('text/plain');
      const targetColumn = list.dataset.column;
      const targetCard = kanbanCards.find(c => c.id === cardId);
      if (targetCard) {
        targetCard.column = targetColumn;
        saveKanban(kanbanCards);
        renderKanban();
      }
    });
  });

  // Setup Column Add Card Buttons
  document.querySelectorAll('.btn-add-card').forEach(btn => {
    btn.addEventListener('click', () => {
      targetKanbanColumn = btn.dataset.column;
      cardTitleInput.value = '';
      kanbanTaskModal.showModal();
      cardTitleInput.focus();
    });
  });

  // Card Priority Pills
  cardPriorityPills.querySelectorAll('.pill').forEach(pill => {
    pill.addEventListener('click', () => {
      cardPriorityPills.querySelectorAll('.pill').forEach(p => p.classList.remove('selected'));
      pill.classList.add('selected');
      selectedCardPriority = pill.dataset.prio;
    });
  });

  // Kanban Task Form Submit
  kanbanTaskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = cardTitleInput.value.trim();
    if (!title) return;

    const newCard = {
      id: 'c-' + Date.now(),
      title,
      column: targetKanbanColumn,
      project: cardProjectSelect.value || 'General',
      priority: selectedCardPriority
    };

    kanbanCards.push(newCard);
    saveKanban(kanbanCards);
    kanbanTaskModal.close();
    renderKanban();
  });

  closeCardModalBtn.addEventListener('click', () => kanbanTaskModal.close());

  // Project Color Pills
  projectColorPills.querySelectorAll('.pill').forEach(pill => {
    pill.addEventListener('click', () => {
      projectColorPills.querySelectorAll('.pill').forEach(p => p.classList.remove('selected'));
      pill.classList.add('selected');
      selectedProjectColor = pill.dataset.color;
    });
  });

  // New Project Form Submit
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

  // Initial renders
  renderProjectCards();
});
