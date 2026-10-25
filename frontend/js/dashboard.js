/**
 * TaskFlow Dashboard Application Script
 * State management, task CRUD, flexible timetable, theme switcher,
 * search, filtering, statistics, modals, and toasts.
 */

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

const App = (() => {
  const DAYS_OF_WEEK = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

  // Application State
  const state = {
    user: null,
    tasks: [],
    stats: {
      totalTasks: 0,
      pendingTasks: 0,
      completedTasks: 0,
      completionRate: 0.0
    },
    filter: 'ALL', // 'ALL' | 'PENDING' | 'COMPLETED'
    search: '',
    sortBy: 'createdAt',
    sortDir: 'desc',
    activeTaskId: null,
    isLoading: false,

    // Theme: 'light' | 'dark' | 'system'
    theme: localStorage.getItem('taskflow-theme') || 'system',

    // View: 'tasks' | 'timetable'
    activeView: 'tasks',

    // Timetable state
    currentTimetableDay: 'MONDAY',
    timetableEntries: [],
    activeTimetableId: null,
    isTimetableLoading: false,
    timetableOverlapConfirmed: false
  };

  // DOM Elements Cache
  let dom = {};

  function cacheDom() {
    dom = {
      // User info
      userName: document.getElementById('user-name'),
      userEmail: document.getElementById('user-email'),
      userAvatar: document.getElementById('user-avatar'),
      welcomeName: document.getElementById('welcome-name'),
      logoutBtn: document.getElementById('logout-btn'),

      // Top navigation & Header
      pageTitle: document.getElementById('page-title'),
      topActionBtn: document.getElementById('open-add-modal-btn'),
      topActionText: document.getElementById('top-action-text'),
      themeButtons: document.querySelectorAll('.theme-toggle-option'),

      // Navigation & Mobile
      navViewTasks: document.getElementById('nav-view-tasks'),
      navViewTimetable: document.getElementById('nav-view-timetable'),
      sidebarTaskFilters: document.getElementById('sidebar-task-filters'),
      navAll: document.getElementById('nav-all'),
      navPending: document.getElementById('nav-pending'),
      navCompleted: document.getElementById('nav-completed'),
      badgeAll: document.getElementById('badge-all'),
      badgePending: document.getElementById('badge-pending'),
      badgeCompleted: document.getElementById('badge-completed'),
      mobileMenuToggle: document.getElementById('mobile-menu-toggle'),
      sidebar: document.getElementById('sidebar'),
      sidebarClose: document.getElementById('sidebar-close'),
      sidebarBackdrop: document.getElementById('sidebar-backdrop'),

      // App Views
      viewTasks: document.getElementById('view-tasks'),
      viewTimetable: document.getElementById('view-timetable'),

      // Task Statistics
      statTotal: document.getElementById('stat-total'),
      statPending: document.getElementById('stat-pending'),
      statCompleted: document.getElementById('stat-completed'),
      statRate: document.getElementById('stat-rate'),

      // Task Toolbar
      searchInput: document.getElementById('search-input'),
      searchClear: document.getElementById('search-clear'),
      filterBtns: document.querySelectorAll('.filter-btn'),
      sortSelect: document.getElementById('sort-select'),
      emptyAddBtn: document.getElementById('empty-add-btn'),

      // Tasks Container
      tasksContainer: document.getElementById('tasks-container'),
      emptyState: document.getElementById('empty-state'),
      loadingSkeleton: document.getElementById('loading-skeleton'),

      // Task Modal (Add/Edit)
      taskModal: document.getElementById('task-modal'),
      taskModalTitle: document.getElementById('task-modal-title'),
      taskForm: document.getElementById('task-form'),
      taskTitleInput: document.getElementById('modal-task-title'),
      taskDescInput: document.getElementById('modal-task-desc'),
      taskDueDateInput: document.getElementById('modal-task-duedate'),
      taskStatusGroup: document.getElementById('modal-status-group'),
      taskStatusSelect: document.getElementById('modal-task-status'),
      taskRecurringInput: document.getElementById('modal-task-recurring'),
      taskRecurrenceDayGroup: document.getElementById('modal-recurrence-day-group'),
      taskRecurrenceDaySelect: document.getElementById('modal-task-recurrence-day'),
      taskModalClose: document.getElementById('task-modal-close'),
      taskModalCancel: document.getElementById('task-modal-cancel'),
      taskModalSubmit: document.getElementById('task-modal-submit'),

      // Delete Task Modal
      deleteModal: document.getElementById('delete-modal'),
      deleteModalClose: document.getElementById('delete-modal-close'),
      deleteModalCancel: document.getElementById('delete-modal-cancel'),
      confirmDeleteBtn: document.getElementById('confirm-delete-btn'),

      // Timetable Elements
      ttPrevDayBtn: document.getElementById('tt-prev-day-btn'),
      ttNextDayBtn: document.getElementById('tt-next-day-btn'),
      ttDayTabs: document.querySelectorAll('.day-tab'),
      ttDayTitle: document.getElementById('tt-day-title'),
      ttDaySubtitle: document.getElementById('tt-day-subtitle'),
      openTimetableAddModalBtn: document.getElementById('open-timetable-add-modal-btn'),
      ttLoadingSkeleton: document.getElementById('tt-loading-skeleton'),
      ttEmptyState: document.getElementById('tt-empty-state'),
      ttEmptyTitle: document.getElementById('tt-empty-title'),
      ttEmptyAddBtn: document.getElementById('tt-empty-add-btn'),
      ttEntriesContainer: document.getElementById('tt-entries-container'),

      // Timetable Entry Modal
      timetableModal: document.getElementById('timetable-modal'),
      timetableModalTitle: document.getElementById('timetable-modal-title'),
      timetableForm: document.getElementById('timetable-form'),
      timetableConflictWarning: document.getElementById('timetable-conflict-warning'),
      conflictWarningText: document.getElementById('conflict-warning-text'),
      modalTtTitle: document.getElementById('modal-tt-title'),
      modalTtDay: document.getElementById('modal-tt-day'),
      modalTtStart: document.getElementById('modal-tt-start'),
      modalTtEnd: document.getElementById('modal-tt-end'),
      modalTtDesc: document.getElementById('modal-tt-desc'),
      modalTtTitleError: document.getElementById('modal-tt-title-error'),
      modalTtTimeError: document.getElementById('modal-tt-time-error'),
      timetableModalClose: document.getElementById('timetable-modal-close'),
      timetableModalCancel: document.getElementById('timetable-modal-cancel'),
      timetableModalSubmit: document.getElementById('timetable-modal-submit'),

      // Timetable Delete Modal
      deleteTimetableModal: document.getElementById('delete-timetable-modal'),
      deleteTtCancel: document.getElementById('delete-tt-cancel'),
      confirmDeleteTtBtn: document.getElementById('confirm-delete-tt-btn')
    };
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================
  async function init() {
    cacheDom();
    initTheme();
    setupEventListeners();

    // Verify authentication
    const isAuthenticated = await checkAuth();
    if (!isAuthenticated) return;

    // Load initial tasks data
    await loadData();
  }

  // ==========================================================================
  // THEME MANAGEMENT (3-Way: Light / Dark / System)
  // ==========================================================================
  function initTheme() {
    applyTheme(state.theme);

    // Watch system changes dynamically
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', () => {
        if (state.theme === 'system') {
          applyTheme('system');
        }
      });
    }

    updateThemeSwitcherUI();
  }

  function applyTheme(theme) {
    state.theme = theme;
    localStorage.setItem('taskflow-theme', theme);

    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }

    updateThemeSwitcherUI();
  }

  function updateThemeSwitcherUI() {
    dom.themeButtons.forEach(btn => {
      const btnTheme = btn.dataset.theme;
      if (btnTheme === state.theme) {
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
      } else {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
      }
    });
  }

  // ==========================================================================
  // AUTHENTICATION & USER PROFILE
  // ==========================================================================
  async function checkAuth() {
    try {
      const response = await API.get('/api/auth/me');
      if (response && response.success && response.data) {
        state.user = response.data;
        updateUserUI(state.user);
        return true;
      }
      window.location.href = '/login.html?expired=true';
      return false;
    } catch (err) {
      console.warn('Session verification failed:', err);
      window.location.href = '/login.html?expired=true';
      return false;
    }
  }

  function updateUserUI(user) {
    if (!user) return;
    if (dom.userName) dom.userName.textContent = user.name;
    if (dom.userEmail) dom.userEmail.textContent = user.email;
    if (dom.welcomeName) dom.welcomeName.textContent = user.name.split(' ')[0];

    const initials = user.name
      .split(' ')
      .filter(Boolean)
      .map(part => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

    if (dom.userAvatar) dom.userAvatar.textContent = initials || 'TF';
  }

  async function handleLogout() {
    try {
      await API.post('/api/auth/logout', {});
    } catch (e) {
      console.warn('Logout API call finished with:', e);
    } finally {
      window.location.href = '/login.html?logout=true';
    }
  }

  // ==========================================================================
  // VIEW SWITCHING (Tasks vs Timetable)
  // ==========================================================================
  function switchView(viewName) {
    state.activeView = viewName;

    if (viewName === 'timetable') {
      // Timetable View
      if (dom.viewTasks) dom.viewTasks.style.display = 'none';
      if (dom.viewTimetable) dom.viewTimetable.style.display = 'block';

      if (dom.navViewTasks) dom.navViewTasks.classList.remove('active');
      if (dom.navViewTimetable) dom.navViewTimetable.classList.add('active');
      if (dom.sidebarTaskFilters) dom.sidebarTaskFilters.style.display = 'none';

      if (dom.pageTitle) dom.pageTitle.textContent = 'Timetable';
      if (dom.topActionText) dom.topActionText.textContent = 'Add Entry';

      // Always determine current weekday fresh using local date/time
      const todayDay = getTodayWeekday();
      state.currentTimetableDay = todayDay;

      renderDayTabsHeaderDates();
      selectTimetableDay(todayDay);
    } else {
      // Tasks View
      if (dom.viewTimetable) dom.viewTimetable.style.display = 'none';
      if (dom.viewTasks) dom.viewTasks.style.display = 'block';

      if (dom.navViewTimetable) dom.navViewTimetable.classList.remove('active');
      if (dom.navViewTasks) dom.navViewTasks.classList.add('active');
      if (dom.sidebarTaskFilters) dom.sidebarTaskFilters.style.display = 'block';

      if (dom.pageTitle) dom.pageTitle.textContent = 'Tasks';
      if (dom.topActionText) dom.topActionText.textContent = 'New Task';
    }
  }

  function handleTopActionClick() {
    if (state.activeView === 'timetable') {
      openTimetableAddModal();
    } else {
      openAddModal();
    }
  }

  // ==========================================================================
  // TASK DATA & CRUD
  // ==========================================================================
  async function loadData() {
    setLoadingState(true);
    try {
      await Promise.all([fetchTasks(), fetchStats()]);
    } catch (err) {
      API.showToast('Unable to load tasks. Please refresh.', 'error');
    } finally {
      setLoadingState(false);
    }
  }

  async function fetchTasks() {
    let url = `/api/tasks?sortBy=${encodeURIComponent(state.sortBy)}&sortDir=${encodeURIComponent(state.sortDir)}`;

    if (state.filter !== 'ALL') {
      url += `&status=${encodeURIComponent(state.filter)}`;
    }
    if (state.search.trim()) {
      url += `&search=${encodeURIComponent(state.search.trim())}`;
    }

    try {
      const response = await API.get(url);
      if (response && response.success) {
        state.tasks = response.data || [];
        renderTasks();
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
      throw err;
    }
  }

  async function fetchStats() {
    try {
      const response = await API.get('/api/tasks/stats');
      if (response && response.success && response.data) {
        state.stats = response.data;
        renderStats();
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }

  function renderStats() {
    const { totalTasks, pendingTasks, completedTasks, completionRate } = state.stats;

    if (dom.statTotal) dom.statTotal.textContent = totalTasks;
    if (dom.statPending) dom.statPending.textContent = pendingTasks;
    if (dom.statCompleted) dom.statCompleted.textContent = completedTasks;
    if (dom.statRate) dom.statRate.textContent = `${completionRate}%`;

    if (dom.badgeAll) dom.badgeAll.textContent = totalTasks;
    if (dom.badgePending) dom.badgePending.textContent = pendingTasks;
    if (dom.badgeCompleted) dom.badgeCompleted.textContent = completedTasks;
  }

  function renderTasks() {
    if (!dom.tasksContainer) return;
    dom.tasksContainer.innerHTML = '';

    if (state.tasks.length === 0) {
      if (dom.emptyState) dom.emptyState.classList.add('visible');
      return;
    }

    if (dom.emptyState) dom.emptyState.classList.remove('visible');

    const fragment = document.createDocumentFragment();

    state.tasks.forEach(task => {
      const isCompleted = task.status === 'COMPLETED';
      const card = document.createElement('div');
      card.className = `task-card ${isCompleted ? 'completed' : ''}`;
      card.dataset.id = task.id;

      // Optional Due Date badge
      let dueDateBadge = '';
      if (task.dueDate) {
        dueDateBadge = `
          <span class="task-due-badge">
            <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            Due ${formatDueDate(task.dueDate)}
          </span>
        `;
      }

      // Optional Recurring Weekly badge
      let recurringBadge = '';
      if (task.recurringWeekly) {
        const recurLabel = task.recurrenceDay ? `Repeats ${capitalize(task.recurrenceDay)}s` : 'Repeats Weekly';
        recurringBadge = `
          <span class="task-recurring-badge">
            <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            ${recurLabel}
          </span>
        `;
      }

      card.innerHTML = `
        <div class="task-checkbox-container">
          <button type="button" class="custom-checkbox ${isCompleted ? 'checked' : ''}" 
                  aria-label="Mark task as ${isCompleted ? 'pending' : 'completed'}" 
                  data-action="toggle-status" data-id="${task.id}" data-current="${task.status}">
            <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </button>
        </div>

        <div class="task-body">
          <div class="task-header-row">
            <h3 class="task-title">${API.escapeHtml(task.title)}</h3>
            <span class="task-status-badge ${task.status.toLowerCase()}">
              <span class="status-dot"></span>
              ${task.status === 'COMPLETED' ? 'Completed' : 'Pending'}
            </span>
          </div>

          ${task.description ? `<p class="task-description">${API.escapeHtml(task.description)}</p>` : ''}

          <div class="task-meta-row">
            <div style="display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap;">
              <span class="task-date">
                <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                Created ${API.formatDate(task.createdAt)}
              </span>
              ${dueDateBadge}
              ${recurringBadge}
            </div>

            <div class="task-actions">
              <button type="button" class="action-btn edit-btn" data-action="edit" data-id="${task.id}">
                <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                Edit
              </button>
              <button type="button" class="action-btn delete-btn" data-action="delete" data-id="${task.id}">
                <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                Delete
              </button>
            </div>
          </div>
        </div>
      `;

      fragment.appendChild(card);
    });

    dom.tasksContainer.appendChild(fragment);
  }

  function setLoadingState(loading) {
    state.isLoading = loading;
    if (dom.loadingSkeleton) {
      dom.loadingSkeleton.style.display = loading ? 'flex' : 'none';
    }
    if (dom.tasksContainer && loading) {
      dom.tasksContainer.style.display = 'none';
    } else if (dom.tasksContainer) {
      dom.tasksContainer.style.display = 'flex';
    }
  }

  async function handleToggleStatus(taskId, currentStatus) {
    const newStatus = currentStatus === 'COMPLETED' ? 'PENDING' : 'COMPLETED';

    const taskIndex = state.tasks.findIndex(t => t.id == taskId);
    if (taskIndex !== -1) {
      state.tasks[taskIndex].status = newStatus;
      renderTasks();
    }

    try {
      const response = await API.patch(`/api/tasks/${taskId}/status`, { status: newStatus });
      if (response && response.success) {
        API.showToast(`Task marked as ${newStatus.toLowerCase()}`, 'success');
        await fetchStats();
      } else {
        throw new Error(response?.message || 'Status update failed');
      }
    } catch (err) {
      API.showToast('Unable to update task status.', 'error');
      await loadData();
    }
  }

  // Open modal in Add mode
  function openAddModal() {
    state.activeTaskId = null;
    dom.taskModalTitle.textContent = 'Create New Task';
    dom.taskTitleInput.value = '';
    dom.taskDescInput.value = '';
    if (dom.taskDueDateInput) dom.taskDueDateInput.value = '';
    if (dom.taskRecurringInput) dom.taskRecurringInput.checked = false;
    if (dom.taskRecurrenceDayGroup) dom.taskRecurrenceDayGroup.style.display = 'none';
    if (dom.taskRecurrenceDaySelect) dom.taskRecurrenceDaySelect.value = '';

    if (dom.taskStatusGroup) dom.taskStatusGroup.style.display = 'none';
    dom.taskModalSubmit.querySelector('.btn-text').textContent = 'Create Task';
    clearModalErrors();
    dom.taskModal.classList.add('active');
    dom.taskTitleInput.focus();
  }

  // Open modal in Edit mode
  function openEditModal(taskId) {
    const task = state.tasks.find(t => t.id == taskId);
    if (!task) return;

    state.activeTaskId = taskId;
    dom.taskModalTitle.textContent = 'Edit Task';
    dom.taskTitleInput.value = task.title;
    dom.taskDescInput.value = task.description || '';
    if (dom.taskDueDateInput) dom.taskDueDateInput.value = task.dueDate || '';

    const isRecurring = !!task.recurringWeekly;
    if (dom.taskRecurringInput) dom.taskRecurringInput.checked = isRecurring;
    if (dom.taskRecurrenceDayGroup) {
      dom.taskRecurrenceDayGroup.style.display = isRecurring ? 'block' : 'none';
    }
    if (dom.taskRecurrenceDaySelect) {
      dom.taskRecurrenceDaySelect.value = task.recurrenceDay || '';
    }

    if (dom.taskStatusGroup) {
      dom.taskStatusGroup.style.display = 'block';
      dom.taskStatusSelect.value = task.status;
    }
    dom.taskModalSubmit.querySelector('.btn-text').textContent = 'Save Changes';
    clearModalErrors();
    dom.taskModal.classList.add('active');
    dom.taskTitleInput.focus();
  }

  function closeTaskModal() {
    dom.taskModal.classList.remove('active');
    state.activeTaskId = null;
  }

  async function handleTaskFormSubmit(e) {
    e.preventDefault();
    clearModalErrors();

    const title = dom.taskTitleInput.value.trim();
    const description = dom.taskDescInput.value.trim();
    const dueDate = dom.taskDueDateInput?.value || null;
    const recurringWeekly = !!dom.taskRecurringInput?.checked;
    const recurrenceDay = (recurringWeekly && dom.taskRecurrenceDaySelect?.value) ? dom.taskRecurrenceDaySelect.value : null;

    if (!title) {
      const errorEl = document.getElementById('modal-title-error');
      if (errorEl) errorEl.textContent = 'Task title is required';
      dom.taskTitleInput.classList.add('is-invalid');
      return;
    }

    const isEdit = state.activeTaskId !== null;
    const submitBtn = dom.taskModalSubmit;
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');

    const payload = {
      title,
      description: description || null,
      dueDate,
      recurringWeekly,
      recurrenceDay
    };

    try {
      if (isEdit) {
        payload.status = dom.taskStatusSelect.value;
        const response = await API.put(`/api/tasks/${state.activeTaskId}`, payload);
        if (response && response.success) {
          API.showToast('Task updated successfully', 'success');
          closeTaskModal();
          await loadData();
        }
      } else {
        const response = await API.post('/api/tasks', payload);
        if (response && response.success) {
          API.showToast('Task created successfully', 'success');
          closeTaskModal();
          await loadData();
        }
      }
    } catch (err) {
      API.showToast(err.message || 'Operation failed. Please try again.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
    }
  }

  function openDeleteModal(taskId) {
    state.activeTaskId = taskId;
    dom.deleteModal.classList.add('active');
    dom.confirmDeleteBtn.focus();
  }

  function closeDeleteModal() {
    dom.deleteModal.classList.remove('active');
    state.activeTaskId = null;
  }

  async function handleConfirmDelete() {
    if (!state.activeTaskId) return;

    const deleteBtn = dom.confirmDeleteBtn;
    deleteBtn.disabled = true;

    try {
      const response = await API.delete(`/api/tasks/${state.activeTaskId}`);
      if (response && response.success) {
        API.showToast('Task deleted successfully', 'success');
        closeDeleteModal();
        await loadData();
      }
    } catch (err) {
      API.showToast('Unable to delete task. Please try again.', 'error');
    } finally {
      deleteBtn.disabled = false;
    }
  }

  function clearModalErrors() {
    const errorEl = document.getElementById('modal-title-error');
    if (errorEl) errorEl.textContent = '';
    if (dom.taskTitleInput) dom.taskTitleInput.classList.remove('is-invalid');
  }

  async function setFilter(filterType) {
    state.filter = filterType;

    dom.filterBtns.forEach(btn => {
      if (btn.dataset.filter === filterType) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    const navMap = {
      'ALL': dom.navAll,
      'PENDING': dom.navPending,
      'COMPLETED': dom.navCompleted
    };

    [dom.navAll, dom.navPending, dom.navCompleted].forEach(nav => nav?.classList.remove('active'));
    if (navMap[filterType]) {
      navMap[filterType].classList.add('active');
    }

    await fetchTasks();
  }

  // ==========================================================================
  // TIMETABLE LOGIC
  // ==========================================================================

  function getTodayWeekday() {
    const dayIndex = new Date().getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
    const map = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    return map[dayIndex];
  }

  // Compute real calendar dates for the 7 day tabs in the current week
  function renderDayTabsHeaderDates() {
    const now = new Date();
    const currentDayIndex = now.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
    // Convert so Monday is 0, Sunday is 6
    const mondayOffset = (currentDayIndex + 6) % 7;

    const mondayDate = new Date(now);
    mondayDate.setDate(now.getDate() - mondayOffset);

    DAYS_OF_WEEK.forEach((day, index) => {
      const dayDate = new Date(mondayDate);
      dayDate.setDate(mondayDate.getDate() + index);

      const monthName = dayDate.toLocaleDateString(undefined, { month: 'short' });
      const dayNum = dayDate.getDate();
      const dateStr = `${monthName} ${dayNum}`;

      const dateEl = document.querySelector(`[data-day-date="${day}"]`);
      if (dateEl) {
        dateEl.textContent = dateStr;
      }
    });
  }

  async function selectTimetableDay(day) {
    state.currentTimetableDay = day;

    // Update tab highlights
    dom.ttDayTabs.forEach(tab => {
      if (tab.dataset.day === day) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    // Update Day Header Titles
    const isToday = (day === getTodayWeekday());
    if (dom.ttDayTitle) {
      dom.ttDayTitle.textContent = `${capitalize(day)} Schedule`;
    }

    if (dom.ttDaySubtitle) {
      const todayDate = new Date();
      const currentDayIndex = todayDate.getDay();
      const mondayOffset = (currentDayIndex + 6) % 7;
      const mondayDate = new Date(todayDate);
      mondayDate.setDate(todayDate.getDate() - mondayOffset);

      const targetDayIndex = DAYS_OF_WEEK.indexOf(day);
      const targetDate = new Date(mondayDate);
      targetDate.setDate(mondayDate.getDate() + targetDayIndex);

      const fullDateStr = targetDate.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
      });

      dom.ttDaySubtitle.textContent = isToday ? `Today • ${fullDateStr}` : fullDateStr;
    }

    // Fetch entries for this day
    await fetchTimetableEntries(day);
  }

  function navigateDay(direction) {
    const currentIndex = DAYS_OF_WEEK.indexOf(state.currentTimetableDay);
    let nextIndex;
    if (direction === 'prev') {
      nextIndex = (currentIndex - 1 + DAYS_OF_WEEK.length) % DAYS_OF_WEEK.length;
    } else {
      nextIndex = (currentIndex + 1) % DAYS_OF_WEEK.length;
    }
    selectTimetableDay(DAYS_OF_WEEK[nextIndex]);
  }

  async function fetchTimetableEntries(day) {
    setTimetableLoading(true);
    try {
      const response = await API.get(`/api/timetable?day=${encodeURIComponent(day)}`);
      if (response && response.success) {
        state.timetableEntries = response.data || [];
        renderTimetableEntries();
      }
    } catch (err) {
      console.error('Error fetching timetable entries:', err);
      API.showToast('Unable to load timetable entries.', 'error');
    } finally {
      setTimetableLoading(false);
    }
  }

  function setTimetableLoading(loading) {
    state.isTimetableLoading = loading;
    if (dom.ttLoadingSkeleton) {
      dom.ttLoadingSkeleton.style.display = loading ? 'flex' : 'none';
    }
    if (dom.ttEntriesContainer && loading) {
      dom.ttEntriesContainer.style.display = 'none';
    } else if (dom.ttEntriesContainer) {
      dom.ttEntriesContainer.style.display = 'flex';
    }
    if (loading && dom.ttEmptyState) {
      dom.ttEmptyState.style.display = 'none';
    }
  }

  function renderTimetableEntries() {
    if (!dom.ttEntriesContainer) return;
    dom.ttEntriesContainer.innerHTML = '';

    if (state.timetableEntries.length === 0) {
      if (dom.ttEmptyState) dom.ttEmptyState.style.display = 'flex';
      if (dom.ttEmptyTitle) {
        dom.ttEmptyTitle.textContent = `No activities on ${capitalize(state.currentTimetableDay)}`;
      }
      return;
    }

    if (dom.ttEmptyState) dom.ttEmptyState.style.display = 'none';

    const fragment = document.createDocumentFragment();

    state.timetableEntries.forEach(entry => {
      const card = document.createElement('div');
      card.className = 'timeline-entry-card';
      card.dataset.id = entry.id;

      const formattedStart = format12Hour(entry.startTime);
      const formattedEnd = format12Hour(entry.endTime);
      const durationText = calculateDuration(entry.startTime, entry.endTime);

      card.innerHTML = `
        <div class="timeline-time-col">
          <div class="timeline-time-range">${formattedStart} – ${formattedEnd}</div>
          <div class="timeline-duration">${durationText}</div>
        </div>

        <div class="timeline-content-col">
          <div class="timeline-entry-header">
            <h3 class="timeline-entry-title">${API.escapeHtml(entry.title)}</h3>
            <div class="task-actions">
              <button type="button" class="action-btn edit-btn" data-tt-action="edit" data-id="${entry.id}">
                <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                Edit
              </button>
              <button type="button" class="action-btn delete-btn" data-tt-action="delete" data-id="${entry.id}">
                <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                Delete
              </button>
            </div>
          </div>

          ${entry.description ? `<p class="timeline-entry-desc">${API.escapeHtml(entry.description)}</p>` : ''}
        </div>
      `;

      fragment.appendChild(card);
    });

    dom.ttEntriesContainer.appendChild(fragment);
  }

  // ==========================================================================
  // TIMETABLE MODAL & OVERLAP HANDLING
  // ==========================================================================

  function openTimetableAddModal() {
    state.activeTimetableId = null;
    state.timetableOverlapConfirmed = false;

    if (dom.timetableModalTitle) dom.timetableModalTitle.textContent = 'Add Timetable Entry';
    if (dom.modalTtTitle) dom.modalTtTitle.value = '';
    if (dom.modalTtDay) dom.modalTtDay.value = state.currentTimetableDay;
    if (dom.modalTtStart) dom.modalTtStart.value = '';
    if (dom.modalTtEnd) dom.modalTtEnd.value = '';
    if (dom.modalTtDesc) dom.modalTtDesc.value = '';

    hideConflictWarning();
    clearTimetableModalErrors();

    if (dom.timetableModalSubmit) {
      dom.timetableModalSubmit.querySelector('.btn-text').textContent = 'Save Entry';
    }

    if (dom.timetableModal) dom.timetableModal.classList.add('active');
    dom.modalTtTitle?.focus();
  }

  function openTimetableEditModal(id) {
    const entry = state.timetableEntries.find(e => e.id == id);
    if (!entry) return;

    state.activeTimetableId = id;
    state.timetableOverlapConfirmed = false;

    if (dom.timetableModalTitle) dom.timetableModalTitle.textContent = 'Edit Timetable Entry';
    if (dom.modalTtTitle) dom.modalTtTitle.value = entry.title;
    if (dom.modalTtDay) dom.modalTtDay.value = entry.dayOfWeek;
    if (dom.modalTtStart) dom.modalTtStart.value = entry.startTime;
    if (dom.modalTtEnd) dom.modalTtEnd.value = entry.endTime;
    if (dom.modalTtDesc) dom.modalTtDesc.value = entry.description || '';

    hideConflictWarning();
    clearTimetableModalErrors();

    if (dom.timetableModalSubmit) {
      dom.timetableModalSubmit.querySelector('.btn-text').textContent = 'Save Changes';
    }

    if (dom.timetableModal) dom.timetableModal.classList.add('active');
    dom.modalTtTitle?.focus();
  }

  function closeTimetableModal() {
    if (dom.timetableModal) dom.timetableModal.classList.remove('active');
    state.activeTimetableId = null;
    state.timetableOverlapConfirmed = false;
    hideConflictWarning();
    clearTimetableModalErrors();
  }

  function clearTimetableModalErrors() {
    if (dom.modalTtTitleError) dom.modalTtTitleError.textContent = '';
    if (dom.modalTtTimeError) dom.modalTtTimeError.textContent = '';
    dom.modalTtTitle?.classList.remove('is-invalid');
    dom.modalTtStart?.classList.remove('is-invalid');
    dom.modalTtEnd?.classList.remove('is-invalid');
  }

  function showConflictWarning(conflicts) {
    if (!dom.timetableConflictWarning || !dom.conflictWarningText) return;

    const conflictSummary = conflicts.map(c => 
      `"${c.title}" (${format12Hour(c.startTime)} – ${format12Hour(c.endTime)})`
    ).join(', ');

    dom.conflictWarningText.textContent = `This time slot overlaps with ${conflictSummary}.`;
    dom.timetableConflictWarning.style.display = 'block';

    if (dom.timetableModalSubmit) {
      dom.timetableModalSubmit.querySelector('.btn-text').textContent = 'Save Anyway';
    }
  }

  function hideConflictWarning() {
    if (dom.timetableConflictWarning) {
      dom.timetableConflictWarning.style.display = 'none';
    }
    state.timetableOverlapConfirmed = false;
  }

  // Check if given times overlap with other entries on the day
  function findLocalOverlaps(day, startTime, endTime, excludeId) {
    if (day !== state.currentTimetableDay) return [];

    const startMin = parseTimeToMinutes(startTime);
    const endMin = parseTimeToMinutes(endTime);

    return state.timetableEntries.filter(e => {
      if (excludeId && e.id == excludeId) return false;
      const eStart = parseTimeToMinutes(e.startTime);
      const eEnd = parseTimeToMinutes(e.endTime);
      return startMin < eEnd && endMin > eStart;
    });
  }

  async function handleTimetableFormSubmit(e) {
    e.preventDefault();
    clearTimetableModalErrors();

    const title = dom.modalTtTitle?.value.trim();
    const day = dom.modalTtDay?.value;
    const startTime = dom.modalTtStart?.value;
    const endTime = dom.modalTtEnd?.value;
    const description = dom.modalTtDesc?.value.trim();

    let hasError = false;

    if (!title) {
      if (dom.modalTtTitleError) dom.modalTtTitleError.textContent = 'Activity title is required';
      dom.modalTtTitle?.classList.add('is-invalid');
      hasError = true;
    }

    if (!startTime || !endTime) {
      if (dom.modalTtTimeError) dom.modalTtTimeError.textContent = 'Start and end times are required';
      if (!startTime) dom.modalTtStart?.classList.add('is-invalid');
      if (!endTime) dom.modalTtEnd?.classList.add('is-invalid');
      hasError = true;
    } else {
      const sMin = parseTimeToMinutes(startTime);
      const eMin = parseTimeToMinutes(endTime);
      if (eMin <= sMin) {
        if (dom.modalTtTimeError) dom.modalTtTimeError.textContent = 'End time must be later than start time';
        dom.modalTtEnd?.classList.add('is-invalid');
        hasError = true;
      }
    }

    if (hasError) return;

    // Check overlap conflict warning if not yet confirmed
    if (!state.timetableOverlapConfirmed) {
      const overlaps = findLocalOverlaps(day, startTime, endTime, state.activeTimetableId);
      if (overlaps.length > 0) {
        showConflictWarning(overlaps);
        state.timetableOverlapConfirmed = true; // Next click will proceed
        return;
      }
    }

    const isEdit = state.activeTimetableId !== null;
    const submitBtn = dom.timetableModalSubmit;
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');

    const payload = {
      title,
      dayOfWeek: day,
      startTime,
      endTime,
      description: description || null
    };

    try {
      if (isEdit) {
        const response = await API.put(`/api/timetable/${state.activeTimetableId}`, payload);
        if (response && response.success) {
          API.showToast('Timetable entry updated', 'success');
          closeTimetableModal();
          // If edited to different day, switch to it, else reload current
          if (day !== state.currentTimetableDay) {
            selectTimetableDay(day);
          } else {
            await fetchTimetableEntries(day);
          }
        }
      } else {
        const response = await API.post('/api/timetable', payload);
        if (response && response.success) {
          API.showToast('Activity added to timetable', 'success');
          closeTimetableModal();
          if (day !== state.currentTimetableDay) {
            selectTimetableDay(day);
          } else {
            await fetchTimetableEntries(day);
          }
        }
      }
    } catch (err) {
      API.showToast(err.message || 'Failed to save timetable entry.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
    }
  }

  function openDeleteTimetableModal(id) {
    state.activeTimetableId = id;
    if (dom.deleteTimetableModal) dom.deleteTimetableModal.classList.add('active');
    dom.confirmDeleteTtBtn?.focus();
  }

  function closeDeleteTimetableModal() {
    if (dom.deleteTimetableModal) dom.deleteTimetableModal.classList.remove('active');
    state.activeTimetableId = null;
  }

  async function handleConfirmDeleteTimetable() {
    if (!state.activeTimetableId) return;

    const deleteBtn = dom.confirmDeleteTtBtn;
    deleteBtn.disabled = true;

    try {
      const response = await API.delete(`/api/timetable/${state.activeTimetableId}`);
      if (response && response.success) {
        API.showToast('Timetable entry removed', 'success');
        closeDeleteTimetableModal();
        await fetchTimetableEntries(state.currentTimetableDay);
      }
    } catch (err) {
      API.showToast('Unable to delete timetable entry.', 'error');
    } finally {
      deleteBtn.disabled = false;
    }
  }

  // ==========================================================================
  // EVENT LISTENERS SETUP
  // ==========================================================================
  function setupEventListeners() {
    // Theme Switcher buttons
    dom.themeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        applyTheme(btn.dataset.theme);
      });
    });

    // View Navigation (Tasks vs Timetable)
    dom.navViewTasks?.addEventListener('click', (e) => {
      e.preventDefault();
      switchView('tasks');
      closeSidebar();
    });

    dom.navViewTimetable?.addEventListener('click', (e) => {
      e.preventDefault();
      switchView('timetable');
      closeSidebar();
    });

    // Top Header Dynamic Action Button
    dom.topActionBtn?.addEventListener('click', handleTopActionClick);

    // Mobile Navigation Drawer
    dom.mobileMenuToggle?.addEventListener('click', () => {
      dom.sidebar.classList.add('open');
      dom.sidebarBackdrop.classList.add('active');
    });

    const closeSidebar = () => {
      dom.sidebar.classList.remove('open');
      dom.sidebarBackdrop.classList.remove('active');
    };

    dom.sidebarClose?.addEventListener('click', closeSidebar);
    dom.sidebarBackdrop?.addEventListener('click', closeSidebar);

    // Sidebar Task Filters
    dom.navAll?.addEventListener('click', (e) => { e.preventDefault(); setFilter('ALL'); closeSidebar(); });
    dom.navPending?.addEventListener('click', (e) => { e.preventDefault(); setFilter('PENDING'); closeSidebar(); });
    dom.navCompleted?.addEventListener('click', (e) => { e.preventDefault(); setFilter('COMPLETED'); closeSidebar(); });

    // Task Filter toolbar buttons
    dom.filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        setFilter(btn.dataset.filter);
      });
    });

    // Task Search with debounce
    let searchTimeout = null;
    dom.searchInput?.addEventListener('input', (e) => {
      const val = e.target.value;
      if (dom.searchClear) {
        if (val) dom.searchClear.classList.add('visible');
        else dom.searchClear.classList.remove('visible');
      }

      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        state.search = val;
        fetchTasks();
      }, 250);
    });

    dom.searchClear?.addEventListener('click', () => {
      dom.searchInput.value = '';
      dom.searchClear.classList.remove('visible');
      state.search = '';
      fetchTasks();
    });

    // Task Sorting
    dom.sortSelect?.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === 'newest') {
        state.sortBy = 'createdAt';
        state.sortDir = 'desc';
      } else if (val === 'oldest') {
        state.sortBy = 'createdAt';
        state.sortDir = 'asc';
      } else if (val === 'title') {
        state.sortBy = 'title';
        state.sortDir = 'asc';
      }
      fetchTasks();
    });

    // Task Empty CTA
    dom.emptyAddBtn?.addEventListener('click', openAddModal);

    // Recurring Checkbox Toggle in Task Modal
    dom.taskRecurringInput?.addEventListener('change', (e) => {
      if (dom.taskRecurrenceDayGroup) {
        dom.taskRecurrenceDayGroup.style.display = e.target.checked ? 'block' : 'none';
      }
    });

    // Task List Card Action delegation
    dom.tasksContainer?.addEventListener('click', (e) => {
      const toggleBtn = e.target.closest('[data-action="toggle-status"]');
      if (toggleBtn) {
        const id = toggleBtn.dataset.id;
        const current = toggleBtn.dataset.current;
        handleToggleStatus(id, current);
        return;
      }

      const editBtn = e.target.closest('[data-action="edit"]');
      if (editBtn) {
        const id = editBtn.dataset.id;
        openEditModal(id);
        return;
      }

      const deleteBtn = e.target.closest('[data-action="delete"]');
      if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        openDeleteModal(id);
        return;
      }
    });

    // Task Modal Events
    dom.taskModalClose?.addEventListener('click', closeTaskModal);
    dom.taskModalCancel?.addEventListener('click', closeTaskModal);
    dom.taskForm?.addEventListener('submit', handleTaskFormSubmit);

    // Task Delete Modal Events
    dom.deleteModalClose?.addEventListener('click', closeDeleteModal);
    dom.deleteModalCancel?.addEventListener('click', closeDeleteModal);
    dom.confirmDeleteBtn?.addEventListener('click', handleConfirmDelete);

    // Timetable Day Selector Tabs
    dom.ttDayTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        selectTimetableDay(tab.dataset.day);
      });
    });

    // Timetable Day Arrow navigation
    dom.ttPrevDayBtn?.addEventListener('click', () => navigateDay('prev'));
    dom.ttNextDayBtn?.addEventListener('click', () => navigateDay('next'));

    // Timetable Add Actions
    dom.openTimetableAddModalBtn?.addEventListener('click', openTimetableAddModal);
    dom.ttEmptyAddBtn?.addEventListener('click', openTimetableAddModal);

    // Timetable Entries Action delegation
    dom.ttEntriesContainer?.addEventListener('click', (e) => {
      const editBtn = e.target.closest('[data-tt-action="edit"]');
      if (editBtn) {
        const id = editBtn.dataset.id;
        openTimetableEditModal(id);
        return;
      }

      const deleteBtn = e.target.closest('[data-tt-action="delete"]');
      if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        openDeleteTimetableModal(id);
        return;
      }
    });

    // Timetable Time Inputs change -> reset overlap warning
    dom.modalTtStart?.addEventListener('input', () => {
      hideConflictWarning();
      if (dom.timetableModalSubmit) {
        dom.timetableModalSubmit.querySelector('.btn-text').textContent = state.activeTimetableId ? 'Save Changes' : 'Save Entry';
      }
    });
    dom.modalTtEnd?.addEventListener('input', () => {
      hideConflictWarning();
      if (dom.timetableModalSubmit) {
        dom.timetableModalSubmit.querySelector('.btn-text').textContent = state.activeTimetableId ? 'Save Changes' : 'Save Entry';
      }
    });

    // Timetable Modal Events
    dom.timetableModalClose?.addEventListener('click', closeTimetableModal);
    dom.timetableModalCancel?.addEventListener('click', closeTimetableModal);
    dom.timetableForm?.addEventListener('submit', handleTimetableFormSubmit);

    // Timetable Delete Modal Events
    dom.deleteTtCancel?.addEventListener('click', closeDeleteTimetableModal);
    dom.confirmDeleteTtBtn?.addEventListener('click', handleConfirmDeleteTimetable);

    // Global Keydown & Backdrop Clicks for modals
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (dom.taskModal?.classList.contains('active')) closeTaskModal();
        if (dom.deleteModal?.classList.contains('active')) closeDeleteModal();
        if (dom.timetableModal?.classList.contains('active')) closeTimetableModal();
        if (dom.deleteTimetableModal?.classList.contains('active')) closeDeleteTimetableModal();
      }
    });

    dom.taskModal?.addEventListener('click', (e) => {
      if (e.target === dom.taskModal) closeTaskModal();
    });

    dom.deleteModal?.addEventListener('click', (e) => {
      if (e.target === dom.deleteModal) closeDeleteModal();
    });

    dom.timetableModal?.addEventListener('click', (e) => {
      if (e.target === dom.timetableModal) closeTimetableModal();
    });

    dom.deleteTimetableModal?.addEventListener('click', (e) => {
      if (e.target === dom.deleteTimetableModal) closeDeleteTimetableModal();
    });

    // Logout
    dom.logoutBtn?.addEventListener('click', handleLogout);
  }

  // ==========================================================================
  // HELPER FORMATTING FUNCTIONS
  // ==========================================================================

  function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  function parseTimeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  function format12Hour(timeStr) {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    let h = parseInt(parts[0], 10);
    const m = parts[1] || '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${m} ${ampm}`;
  }

  function calculateDuration(startTime, endTime) {
    const s = parseTimeToMinutes(startTime);
    const e = parseTimeToMinutes(endTime);
    const diff = Math.max(0, e - s);
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;

    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h`;
    return `${mins}m`;
  }

  function formatDueDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
    return dateStr;
  }

  return {
    init
  };
})();
