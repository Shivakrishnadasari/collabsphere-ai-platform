import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authService } from '../api/index.js'

const AuthContext = createContext(null)

// Decode JWT payload (no verification – just for reading claims on the client)
function decodeToken(token) {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)       // { userId, roles[], email? }
  const [loading, setLoading] = useState(true)

  // Hydrate from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      const claims = decodeToken(token)
      if (claims && claims.exp * 1000 > Date.now()) {
        setUser({ userId: claims.sub, roles: claims.roles || [] })
      } else {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
      }
    }
    setLoading(false)
  }, [])

  // Listen for forced logout from axios interceptor
  useEffect(() => {
    const handler = () => logout()
    window.addEventListener('auth:logout', handler)
    return () => window.removeEventListener('auth:logout', handler)
  }, [])

  const login = useCallback(async (email, password) => {
    const { data } = await authService.login(email, password)
    localStorage.setItem('accessToken', data.accessToken)
    localStorage.setItem('refreshToken', data.refreshToken)
    const claims = decodeToken(data.accessToken)
    setUser({ userId: claims.sub, roles: claims.roles || [], email })
    return data
  }, [])

  const register = useCallback(async (email, password) => {
    await authService.register(email, password)
  }, [])

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken')
    try {
      if (refreshToken) await authService.logout(refreshToken)
    } catch { /* swallow */ }
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    setUser(null)
  }, [])

  const isAdmin = user?.roles?.includes('ADMIN') ?? false

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}