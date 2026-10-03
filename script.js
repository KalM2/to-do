// * DOM ELEMENTS
const btnTime = document.getElementById('btnTime');
const btnPriority = document.getElementById('btnPriority');
const timeGroup = document.getElementById('timeGroup');
const priorityGroup = document.getElementById('priorityGroup');
const taskInput = document.getElementById('AddTasksInput');
const addTaskBtn = document.getElementById('AddTaskBtn');
const greetingPrefixEl = document.getElementById('greetingPrefix');
const userNameEl = document.getElementById('userName');
const dateDisplayEl = document.getElementById('currentDateDisplay');
const statsCountEl = document.getElementById('statsCount');
const statsFillEl = document.getElementById('statsBarFill');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');

// ! SVGs
const deleteSVG = `<svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg>`;
const subtaskSVG = `<svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px"><path d="m560-120-57-57 144-143H200v-480h80v400h367L503-544l56-57 241 241-240 240Z"/></svg>`;
const editSVG = `<svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px"><path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/></svg>`;

// Helper: Escape HTML to avoid XSS
const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

// ! STATE
let activeView = 'time';
let selectedTimePill = null;
let selectedPriorityPill = null;

// ! PILLS (Toggleable Logic)
const setupPills = (containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.querySelectorAll('.pill').forEach(pill => {
        pill.addEventListener('click', () => {
            const isSelected = pill.classList.contains('selected');
            container.querySelectorAll('.pill').forEach(p => p.classList.remove('selected'));
            if (!isSelected) {
                pill.classList.add('selected');
                if (containerId === 'timePills') selectedTimePill = pill.dataset.value;
                if (containerId === 'priorityPills') selectedPriorityPill = pill.dataset.value;
            } else {
                if (containerId === 'timePills') selectedTimePill = null;
                if (containerId === 'priorityPills') selectedPriorityPill = null;
            }
        });
    });
};
setupPills('timePills');
setupPills('priorityPills');

// ! SORTING ENGINE
const sortTasks = (list) => {
    if (!list) return;

    // Find all direct task containers
    const allTaskContainers = Array.from(list.querySelectorAll('.task-container')).filter(
        t => t.parentElement === list || t.parentElement.tagName === 'DETAILS'
    );

    const incomplete = allTaskContainers.filter(t => !t.classList.contains('completed'));
    const completed = allTaskContainers.filter(t => t.classList.contains('completed'));

    // Clean up existing dropdown
    const existingDropdown = list.querySelector('.completed-tasks-dropdown');
    if (existingDropdown) existingDropdown.remove();

    // Re-append incomplete tasks to main list
    incomplete.forEach(t => list.appendChild(t));

    // Handle completed tasks dropdown
    if (completed.length > 2) {
        const dropdown = document.createElement('details');
        dropdown.className = 'completed-tasks-dropdown';
        dropdown.innerHTML = `<summary>Completed Tasks (${completed.length})</summary>`;
        list.appendChild(dropdown);
        completed.forEach(t => dropdown.appendChild(t));
    } else {
        completed.forEach(t => list.appendChild(t));
    }
};

// ! RE-HOMING (Switching views)
const rehomeAllTasks = () => {
    const allTasks = document.querySelectorAll('.task-container');
    allTasks.forEach(task => {
        if (task.parentElement && task.parentElement.classList.contains('subtask-list')) return;

        const timeVal = task.dataset.time;
        const prioVal = task.dataset.priority;
        let targetId = 'remainingTaskList';

        if (activeView === 'time' && timeVal && timeVal !== 'advanced') {
            targetId = timeVal;
        } else if (activeView === 'priority' && prioVal) {
            targetId = prioVal;
        }

        const targetList = document.getElementById(targetId) || document.getElementById('remainingTaskList');
        if (targetList) {
            targetList.appendChild(task);
            sortTasks(targetList);
        }
    });
    saveTasks();
    updateStats();
};

if (btnTime && btnPriority) {
    btnTime.addEventListener('click', () => {
        activeView = 'time';
        timeGroup.classList.remove('hidden');
        priorityGroup.classList.add('hidden');
        btnTime.classList.add('active');
        btnPriority.classList.remove('active');
        rehomeAllTasks();
    });

    btnPriority.addEventListener('click', () => {
        activeView = 'priority';
        priorityGroup.classList.remove('hidden');
        timeGroup.classList.add('hidden');
        btnPriority.classList.add('active');
        btnTime.classList.remove('active');
        rehomeAllTasks();
    });
}

// ! SUBTASK CREATION
const createSubtask = (text, isCompleted = false) => {
    const div = document.createElement('div');
    div.className = 'subtask-item' + (isCompleted ? ' completed' : '');
    div.innerHTML = `
        <input type="checkbox" class="sub-cb" ${isCompleted ? 'checked' : ''} aria-label="Mark subtask completed">
        <span class="subtask-text">${escapeHtml(text)}</span>
        <div class="task-actions">
            <button class="action-btn sub-del" title="Delete Subtask">${deleteSVG}</button>
        </div>`;

    const cb = div.querySelector('.sub-cb');
    cb.addEventListener('change', () => {
        div.classList.toggle('completed', cb.checked);
        const subList = div.closest('.subtask-list');
        if (subList) {
            const items = Array.from(subList.children).filter(i => i.classList.contains('subtask-item'));
            items.sort((a, b) => (a.classList.contains('completed') ? 1 : 0) - (b.classList.contains('completed') ? 1 : 0));
            items.forEach(i => subList.appendChild(i));
        }
        saveTasks();
        updateStats();
    });

    div.querySelector('.sub-del').addEventListener('click', () => {
        div.remove();
        saveTasks();
        updateStats();
    });

    return div;
};

// ! MAIN TASK ITEM CREATION
const createTaskListitem = (text, time, prio, isCompleted = false, initialSubtasks = []) => {
    const container = document.createElement('div');
    container.className = 'task-container' + (isCompleted ? ' completed' : '');
    container.draggable = true;
    container.dataset.time = time || "";
    container.dataset.priority = prio || "";

    container.innerHTML = `
        <div class="task-item">
            <input type="checkbox" class="main-cb" ${isCompleted ? 'checked' : ''} aria-label="Mark task completed">
            <span class="task-text" title="Double click to edit">${escapeHtml(text)}</span>
            <div class="task-actions">
                <button class="action-btn edit-btn" title="Edit task">${editSVG}</button>
                <button class="action-btn sub-btn" title="Add Subtask">${subtaskSVG}</button>
                <button class="action-btn del-btn" title="Delete Task">${deleteSVG}</button>
            </div>
        </div>
        <div class="subtask-list"></div>
        <input type="text" class="subtask-input" placeholder="Type subtask and press Enter...">
    `;

    const mainCb = container.querySelector('.main-cb');
    const subBtn = container.querySelector('.sub-btn');
    const editBtn = container.querySelector('.edit-btn');
    const taskSpan = container.querySelector('.task-text');
    const subInput = container.querySelector('.subtask-input');
    const subList = container.querySelector('.subtask-list');

    // Populate initial subtasks if any
    if (initialSubtasks && initialSubtasks.length > 0) {
        initialSubtasks.forEach(st => {
            subList.appendChild(createSubtask(st.text, st.completed));
        });
    }

    // Completion Toggle
    mainCb.addEventListener('change', () => {
        container.classList.toggle('completed', mainCb.checked);
        container.querySelectorAll('.sub-cb').forEach(cb => {
            cb.checked = mainCb.checked;
            cb.parentElement.classList.toggle('completed', mainCb.checked);
        });
        subInput.style.display = 'none';
        if (container.parentElement) {
            sortTasks(container.parentElement);
        }
        saveTasks();
        updateStats();
    });

    // Inline Task Editing
    const startEditing = () => {
        const currentText = taskSpan.textContent;
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

    // Subtask toggle & input
    subBtn.addEventListener('click', () => {
        if (mainCb.checked) return;
        const isShown = subInput.style.display === 'block';
        subInput.style.display = isShown ? 'none' : 'block';
        if (!isShown) subInput.focus();
    });

    subInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const val = subInput.value.trim();
            if (val) {
                subList.appendChild(createSubtask(val, false));
                subInput.value = "";
                subInput.focus();
                saveTasks();
                updateStats();
            } else {
                subInput.style.display = 'none';
            }
        } else if (e.key === 'Escape') {
            subInput.style.display = 'none';
        }
    });

    // Drag Setup
    container.addEventListener('dragstart', (e) => {
        container.classList.add('dragging');
        e.stopPropagation();
    });
    container.addEventListener('dragend', () => {
        container.classList.remove('dragging');
        saveTasks();
        updateStats();
    });

    // Nesting (Drop on Task)
    const taskItem = container.querySelector('.task-item');
    taskItem.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        taskItem.classList.add('drag-over-item');
    });
    taskItem.addEventListener('dragleave', () => taskItem.classList.remove('drag-over-item'));
    taskItem.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        taskItem.classList.remove('drag-over-item');
        const dragging = document.querySelector('.dragging');
        if (dragging && dragging !== container) {
            subList.appendChild(dragging);
            if (container.parentElement) {
                sortTasks(container.parentElement);
            }
            saveTasks();
            updateStats();
        }
    });

    container.querySelector('.del-btn').addEventListener('click', () => {
        const parent = container.parentElement;
        container.remove();
        if (parent) sortTasks(parent);
        saveTasks();
        updateStats();
    });

    return container;
};

// ! STORAGE PERSISTENCE
const saveTasks = () => {
    const tasks = [];
    document.querySelectorAll('.task-list').forEach(list => {
        const listId = list.id;
        list.querySelectorAll(':scope > .task-container, :scope > details.completed-tasks-dropdown > .task-container').forEach(task => {
            const textEl = task.querySelector('.task-item > .task-text');
            if (!textEl) return;
            const text = textEl.textContent.trim();
            const completed = task.classList.contains('completed');
            const time = task.dataset.time || "";
            const priority = task.dataset.priority || "";
            const subtasks = [];
            task.querySelectorAll('.subtask-item').forEach(st => {
                const stText = st.querySelector('.subtask-text')?.textContent.trim() || "";
                const stCompleted = st.classList.contains('completed');
                if (stText) subtasks.push({ text: stText, completed: stCompleted });
            });
            tasks.push({
                text,
                completed,
                time,
                priority,
                listId,
                subtasks
            });
        });
    });
    localStorage.setItem('simpleDay_tasks', JSON.stringify(tasks));
};

const loadTasks = () => {
    const raw = localStorage.getItem('simpleDay_tasks');
    let taskData = null;
    if (raw) {
        try {
            taskData = JSON.parse(raw);
        } catch (e) {
            console.error('Failed to parse saved tasks', e);
        }
    }

    // Seed helpful starter tasks on first launch
    if (!taskData || !Array.isArray(taskData) || taskData.length === 0) {
        taskData = [
            {
                text: "Plan today's high-impact goals",
                completed: false,
                time: "morning-list",
                priority: "urgent-important-list",
                listId: "morning-list",
                subtasks: [
                    { text: "Review active projects & priorities", completed: true },
                    { text: "Schedule 25-minute deep focus block", completed: false }
                ]
            },
            {
                text: "Refactor core application logic & test edge cases",
                completed: false,
                time: "afternoon-list",
                priority: "important-list",
                listId: "afternoon-list",
                subtasks: []
            },
            {
                text: "Evening reflection and daily wind down",
                completed: false,
                time: "evening-list",
                priority: "urgent-list",
                listId: "evening-list",
                subtasks: []
            }
        ];
    }

    // Clear lists
    document.querySelectorAll('.task-list').forEach(list => {
        list.innerHTML = "";
    });

    taskData.forEach(item => {
        let targetId = item.listId || 'remainingTaskList';
        if (activeView === 'time') {
            targetId = (item.time && item.time !== 'advanced') ? item.time : 'remainingTaskList';
        } else if (activeView === 'priority') {
            targetId = item.priority ? item.priority : 'remainingTaskList';
        }

        const targetList = document.getElementById(targetId) || document.getElementById('remainingTaskList');
        if (targetList) {
            const taskEl = createTaskListitem(item.text, item.time, item.priority, item.completed, item.subtasks);
            targetList.appendChild(taskEl);
        }
    });

    document.querySelectorAll('.task-list').forEach(list => sortTasks(list));
    updateStats();
};

// ! STATS TRACKER
const updateStats = () => {
    const allTasks = document.querySelectorAll('.task-container');
    const completedTasks = document.querySelectorAll('.task-container.completed');
    const total = allTasks.length;
    const completed = completedTasks.length;

    if (statsCountEl) {
        statsCountEl.textContent = `${completed} of ${total} completed`;
    }
    if (statsFillEl) {
        const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
        statsFillEl.style.width = `${pct}%`;
    }
};

// Clear completed tasks button
if (clearCompletedBtn) {
    clearCompletedBtn.addEventListener('click', () => {
        const completedTasks = document.querySelectorAll('.task-container.completed');
        if (completedTasks.length === 0) return;
        completedTasks.forEach(task => {
            const parent = task.parentElement;
            task.remove();
            if (parent) sortTasks(parent);
        });
        saveTasks();
        updateStats();
    });
}

// ! ADD TASK HANDLER
const handleAddTask = () => {
    const text = taskInput.value.trim();
    if (!text) return;
    const newTask = createTaskListitem(text, selectedTimePill, selectedPriorityPill, false, []);
    let targetId = 'remainingTaskList';
    if (activeView === 'time' && selectedTimePill && selectedTimePill !== 'advanced') {
        targetId = selectedTimePill;
    } else if (activeView === 'priority' && selectedPriorityPill) {
        targetId = selectedPriorityPill;
    }

    const targetList = document.getElementById(targetId) || document.getElementById('remainingTaskList');
    targetList.appendChild(newTask);
    sortTasks(targetList);
    saveTasks();
    updateStats();

    taskInput.value = "";
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

// ! DROPTARGETS
document.querySelectorAll('.task-list').forEach(list => {
    list.addEventListener('dragover', (e) => {
        e.preventDefault();
        list.classList.add('drag-over');
    });
    list.addEventListener('dragleave', () => list.classList.remove('drag-over'));
    list.addEventListener('drop', (e) => {
        e.preventDefault();
        list.classList.remove('drag-over');
        const dragging = document.querySelector('.dragging');
        if (dragging) {
            if (activeView === 'time') {
                dragging.dataset.time = list.id !== 'remainingTaskList' ? list.id : "";
            } else {
                dragging.dataset.priority = list.id !== 'remainingTaskList' ? list.id : "";
            }
            list.appendChild(dragging);
            sortTasks(list);
            saveTasks();
            updateStats();
        }
    });
});

// ! USER PROFILE & GREETING
const savedName = localStorage.getItem('simpleTracker_userName') || 'Kaleb';
if (userNameEl) {
    userNameEl.textContent = savedName;
    userNameEl.addEventListener('blur', () => {
        const newName = userNameEl.textContent.trim() || 'Kaleb';
        userNameEl.textContent = newName;
        localStorage.setItem('simpleTracker_userName', newName);
        try {
            const raw = localStorage.getItem('simpleDay_profile');
            const p = raw ? JSON.parse(raw) : { name: newName };
            p.name = newName;
            localStorage.setItem('simpleDay_profile', JSON.stringify(p));
            const headerName = document.getElementById('headerProfileName');
            const headerAvatar = document.getElementById('headerProfileAvatar');
            if (headerName) headerName.textContent = newName;
            if (headerAvatar && (!p.avatar || p.avatar.length === 1)) {
                headerAvatar.textContent = newName.charAt(0).toUpperCase();
            }
        } catch (e) {}
    });
    userNameEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            userNameEl.blur();
        }
    });
}

const updateGreetingAndDate = () => {
    const now = new Date();
    const hour = now.getHours();
    let prefix = (hour < 12) ? "Good Morning" : (hour < 18) ? "Good Afternoon" : "Good Evening";
    if (greetingPrefixEl) {
        greetingPrefixEl.textContent = prefix;
    }
    if (dateDisplayEl) {
        const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
        dateDisplayEl.textContent = now.toLocaleDateString(undefined, options);
    }
};
updateGreetingAndDate();

// Initialize on DOM load
loadTasks();