/**
 * TaskFlow Dashboard Application Script
 * State management, task CRUD, filtering, searching, statistics, modals, and toasts
 */

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

const App = (() => {
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
    isLoading: false
  };

  // DOM Elements cache
  let dom = {};

  function cacheDom() {
    dom = {
      // User info
      userName: document.getElementById('user-name'),
      userEmail: document.getElementById('user-email'),
      userAvatar: document.getElementById('user-avatar'),
      welcomeName: document.getElementById('welcome-name'),
      logoutBtn: document.getElementById('logout-btn'),

      // Navigation & Mobile
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

      // Statistics
      statTotal: document.getElementById('stat-total'),
      statPending: document.getElementById('stat-pending'),
      statCompleted: document.getElementById('stat-completed'),
      statRate: document.getElementById('stat-rate'),

      // Toolbar
      searchInput: document.getElementById('search-input'),
      searchClear: document.getElementById('search-clear'),
      filterBtns: document.querySelectorAll('.filter-btn'),
      sortSelect: document.getElementById('sort-select'),
      openAddModalBtn: document.getElementById('open-add-modal-btn'),
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
      taskStatusGroup: document.getElementById('modal-status-group'),
      taskStatusSelect: document.getElementById('modal-task-status'),
      taskModalClose: document.getElementById('task-modal-close'),
      taskModalCancel: document.getElementById('task-modal-cancel'),
      taskModalSubmit: document.getElementById('task-modal-submit'),

      // Delete Confirmation Modal
      deleteModal: document.getElementById('delete-modal'),
      deleteModalClose: document.getElementById('delete-modal-close'),
      deleteModalCancel: document.getElementById('delete-modal-cancel'),
      confirmDeleteBtn: document.getElementById('confirm-delete-btn')
    };
  }

  // Initialization
  async function init() {
    cacheDom();
    setupEventListeners();

    // Verify session
    const isAuthenticated = await checkAuth();
    if (!isAuthenticated) return;

    // Load initial data
    await loadData();
  }

  // Verify authentication with backend
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

  // Populate user profile info in header/sidebar
  function updateUserUI(user) {
    if (!user) return;
    if (dom.userName) dom.userName.textContent = user.name;
    if (dom.userEmail) dom.userEmail.textContent = user.email;
    if (dom.welcomeName) dom.welcomeName.textContent = user.name.split(' ')[0];

    const initials = user.name
      .split(' ')
      .map(part => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

    if (dom.userAvatar) dom.userAvatar.textContent = initials || 'TF';
  }

  // Load tasks and statistics
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

  // Fetch tasks matching current filter, search, and sort
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

  // Fetch summary statistics
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

  // Render statistics cards and sidebar counts
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

  // Render task list or empty state
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
            <span class="task-date">
              <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              Created ${API.formatDate(task.createdAt)}
            </span>

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

  // Loading skeleton state
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

  // Quick toggle status (Pending <-> Completed)
  async function handleToggleStatus(taskId, currentStatus) {
    const newStatus = currentStatus === 'COMPLETED' ? 'PENDING' : 'COMPLETED';

    // Optimistic UI update
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
    if (dom.taskStatusGroup) {
      dom.taskStatusGroup.style.display = 'block';
      dom.taskStatusSelect.value = task.status;
    }
    dom.taskModalSubmit.querySelector('.btn-text').textContent = 'Save Changes';
    clearModalErrors();
    dom.taskModal.classList.add('active');
    dom.taskTitleInput.focus();
  }

  // Close Add/Edit modal
  function closeTaskModal() {
    dom.taskModal.classList.remove('active');
    state.activeTaskId = null;
  }

  // Submit Add or Edit Task form
  async function handleTaskFormSubmit(e) {
    e.preventDefault();
    clearModalErrors();

    const title = dom.taskTitleInput.value.trim();
    const description = dom.taskDescInput.value.trim();

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

    try {
      if (isEdit) {
        const status = dom.taskStatusSelect.value;
        const response = await API.put(`/api/tasks/${state.activeTaskId}`, {
          title,
          description: description || null,
          status
        });
        if (response && response.success) {
          API.showToast('Task updated successfully', 'success');
          closeTaskModal();
          await loadData();
        }
      } else {
        const response = await API.post('/api/tasks', {
          title,
          description: description || null
        });
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

  // Open Delete Confirmation modal
  function openDeleteModal(taskId) {
    state.activeTaskId = taskId;
    dom.deleteModal.classList.add('active');
    dom.confirmDeleteBtn.focus();
  }

  // Close Delete Confirmation modal
  function closeDeleteModal() {
    dom.deleteModal.classList.remove('active');
    state.activeTaskId = null;
  }

  // Confirm task deletion
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

  // Set filter (ALL, PENDING, COMPLETED)
  async function setFilter(filterType) {
    state.filter = filterType;

    // Update filter buttons
    dom.filterBtns.forEach(btn => {
      if (btn.dataset.filter === filterType) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update sidebar nav links
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

  // Handle Logout
  async function handleLogout() {
    try {
      await API.post('/api/auth/logout', {});
    } catch (e) {
      console.warn('Logout API call finished with:', e);
    } finally {
      window.location.href = '/login.html?logout=true';
    }
  }

  // Setup Event Listeners
  function setupEventListeners() {
    // Mobile navigation
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

    // Sidebar navigation
    dom.navAll?.addEventListener('click', (e) => { e.preventDefault(); setFilter('ALL'); closeSidebar(); });
    dom.navPending?.addEventListener('click', (e) => { e.preventDefault(); setFilter('PENDING'); closeSidebar(); });
    dom.navCompleted?.addEventListener('click', (e) => { e.preventDefault(); setFilter('COMPLETED'); closeSidebar(); });

    // Filter toolbar buttons
    dom.filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        setFilter(btn.dataset.filter);
      });
    });

    // Search with debounce
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

    // Sorting
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

    // Add Task Button
    dom.openAddModalBtn?.addEventListener('click', openAddModal);
    dom.emptyAddBtn?.addEventListener('click', openAddModal);

    // Task Actions inside list (Event delegation)
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

    // Modal Events
    dom.taskModalClose?.addEventListener('click', closeTaskModal);
    dom.taskModalCancel?.addEventListener('click', closeTaskModal);
    dom.taskForm?.addEventListener('submit', handleTaskFormSubmit);

    dom.deleteModalClose?.addEventListener('click', closeDeleteModal);
    dom.deleteModalCancel?.addEventListener('click', closeDeleteModal);
    dom.confirmDeleteBtn?.addEventListener('click', handleConfirmDelete);

    // Close modals on Escape key or backdrop click
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (dom.taskModal?.classList.contains('active')) closeTaskModal();
        if (dom.deleteModal?.classList.contains('active')) closeDeleteModal();
      }
    });

    dom.taskModal?.addEventListener('click', (e) => {
      if (e.target === dom.taskModal) closeTaskModal();
    });

    dom.deleteModal?.addEventListener('click', (e) => {
      if (e.target === dom.deleteModal) closeDeleteModal();
    });

    // Logout
    dom.logoutBtn?.addEventListener('click', handleLogout);
  }

  return {
    init
  };
})();
