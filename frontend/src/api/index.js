import axios from 'axios'

/* ============================
   AUTH API (8081)
============================ */

export const authApi = axios.create({
  baseURL: 'http://localhost:8081',
  headers: { 'Content-Type': 'application/json' },
})


/* ============================
   PROJECT API (8082)
============================ */

export const projectApi = axios.create({
  baseURL: 'http://localhost:8082',
  headers: { 'Content-Type': 'application/json' },
})


/* ============================
   REQUEST INTERCEPTOR
   Attach JWT token
============================ */

projectApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})


/* ============================
   RESPONSE INTERCEPTOR
   Handle token refresh
============================ */

projectApi.interceptors.response.use(
  (res) => res,

  async (error) => {

    const original = error.config

    if (error.response?.status === 401 && !original._retry) {

      original._retry = true

      const refreshToken = localStorage.getItem('refreshToken')

      if (!refreshToken) {
        window.dispatchEvent(new Event('auth:logout'))
        return Promise.reject(error)
      }

      try {

        const { data } = await authApi.post('/api/auth/refresh', { refreshToken })

        localStorage.setItem('accessToken', data.accessToken)
        localStorage.setItem('refreshToken', data.refreshToken)

        original.headers.Authorization = `Bearer ${data.accessToken}`

        return projectApi(original)

      } catch {

        window.dispatchEvent(new Event('auth:logout'))

        return Promise.reject(error)

      }
    }

    return Promise.reject(error)
  }
)


/* ============================
   AUTH SERVICE
============================ */

export const authService = {

  register: (email, password) =>
    authApi.post('/api/auth/register', { email, password }),

  login: (email, password) =>
    authApi.post('/api/auth/login', { email, password }),

  refresh: (refreshToken) =>
    authApi.post('/api/auth/refresh', { refreshToken }),

  logout: (refreshToken) =>
    authApi.post('/api/auth/logout', { refreshToken }),

}


/* ============================
   PROJECT SERVICE
============================ */

export const projectService = {

  getAll: () =>
    projectApi.get('/api/projects'),

  create: (name, description) =>
    projectApi.post('/api/projects', { name, description }),

  addMember: (projectId, userId, role) =>
    projectApi.post(`/api/projects/${projectId}/members`, { userId, role }),

  changeRole: (projectId, userId, role) =>
    projectApi.patch(`/api/projects/${projectId}/members/${userId}/role`, { role }),

  removeMember: (projectId, userId) =>
    projectApi.delete(`/api/projects/${projectId}/members/${userId}`),

}


/* ============================
   TASK SERVICE
============================ */

export const taskService = {

  getBoard: (projectId) =>
    projectApi.get(`/api/projects/${projectId}/tasks/board`),

  getList: (projectId, params = {}) =>
    projectApi.get(`/api/projects/${projectId}/tasks`, { params }),

  create: (projectId, payload) =>
    projectApi.post(`/api/projects/${projectId}/tasks`, payload),

  update: (projectId, taskId, payload) =>
    projectApi.put(`/api/projects/${projectId}/tasks/${taskId}`, payload),

  move: (projectId, taskId, payload) =>
    projectApi.patch(`/api/projects/${projectId}/tasks/${taskId}/move`, payload),

  delete: (projectId, taskId) =>
    projectApi.delete(`/api/projects/${projectId}/tasks/${taskId}`),

}


/* ============================
   AI SERVICE
============================ */

export const aiService = {

  chat: (message) =>
    projectApi.post('/api/ai/chat', { message }),

}