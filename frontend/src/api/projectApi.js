const PROJECT_BASE = 'http://localhost:8082/api';

const authFetch = async (url, options = {}) => {
  const token = localStorage.getItem('accessToken');

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || `Request failed: ${res.status}`);
  }

  if (res.status === 204) return null;

  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

export const projectApi = {

  // =====================
  // Projects
  // =====================

  getProjects: () => authFetch(`${PROJECT_BASE}/projects`),

  createProject: (name, description) =>
    authFetch(`${PROJECT_BASE}/projects`, {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    }),

  // =====================
  // Members
  // =====================

  addMember: (projectId, userId, role) =>
    authFetch(`${PROJECT_BASE}/projects/${projectId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId, role }),
    }),

  changeRole: (projectId, userId, role) =>
    authFetch(`${PROJECT_BASE}/projects/${projectId}/members/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  removeMember: (projectId, userId) =>
    authFetch(`${PROJECT_BASE}/projects/${projectId}/members/${userId}`, {
      method: 'DELETE',
    }),

  // =====================
  // Tasks
  // =====================

  getTasks: (projectId, params = {}) => {
    const query = new URLSearchParams({
      page: params.page ?? 0,
      size: params.size ?? 20,
      sortBy: params.sortBy ?? 'createdAt',
      direction: params.direction ?? 'desc',
      ...(params.status ? { status: params.status } : {}),
    });

    return authFetch(`${PROJECT_BASE}/projects/${projectId}/tasks?${query}`);
  },

  createTask: (projectId, data) =>
    authFetch(`${PROJECT_BASE}/projects/${projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateTask: (projectId, taskId, data) =>
    authFetch(`${PROJECT_BASE}/projects/${projectId}/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteTask: (projectId, taskId) =>
    authFetch(`${PROJECT_BASE}/projects/${projectId}/tasks/${taskId}`, {
      method: 'DELETE',
    }),

  getBoard: (projectId) =>
    authFetch(`${PROJECT_BASE}/projects/${projectId}/tasks/board`),

  moveTask: (projectId, taskId, newStatus, newPosition, version) =>
    authFetch(`${PROJECT_BASE}/projects/${projectId}/tasks/${taskId}/move`, {
      method: 'PATCH',
      body: JSON.stringify({ newStatus, newPosition, version }),
    }),

  // =====================
  // AI Assistant
  // =====================

  aiChat: (message) =>
    authFetch(`${PROJECT_BASE}/ai/chat`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),
};