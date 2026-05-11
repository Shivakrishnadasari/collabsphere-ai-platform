import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { projectService } from '../../api/index.js'
import { LayoutDashboard, FolderKanban, LogOut, ChevronRight, Menu, X, Zap } from 'lucide-react'

export default function AppLayout() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [projects, setProjects] = useState([])
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    projectService.getAll().then(r => setProjects(r.data)).catch(() => {})
  }, [location.pathname])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const initials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : '??'

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside style={{
        width: collapsed ? 64 : 'var(--sidebar-width)',
        minWidth: collapsed ? 64 : 'var(--sidebar-width)',
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.25s ease, min-width 0.25s ease',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{
          padding: '20px 16px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border)',
          minHeight: 64,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
            <div style={{
              width: 32, height: 32, background: 'var(--accent)', borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#000', flexShrink: 0,
            }}>
              <Zap size={16} />
            </div>
            {!collapsed && (
              <span style={{
                fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem',
                color: 'var(--text-primary)', whiteSpace: 'nowrap', letterSpacing: '-0.02em',
              }}>
                CollabSphere
              </span>
            )}
          </div>
          <button
            onClick={() => setCollapsed(v => !v)}
            style={{
              width: 24, height: 24, borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-muted)', transition: 'color 0.2s',
              flexShrink: 0,
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <ChevronRight size={14} style={{ transform: collapsed ? 'none' : 'rotate(180deg)', transition: 'transform 0.25s' }} />
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto', overflowX: 'hidden' }}>
          <NavItem to="/dashboard" icon={<LayoutDashboard size={18} />} label="Dashboard" collapsed={collapsed} location={location} />

          {projects.length > 0 && (
            <>
              {!collapsed && (
                <div style={{
                  padding: '16px 8px 6px',
                  fontSize: '0.7rem', fontWeight: 600,
                  color: 'var(--text-muted)', textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}>Projects</div>
              )}
              {collapsed && <div style={{ height: 8 }} />}
              {projects.map(p => (
                <NavItem
                  key={p.id}
                  to={`/projects/${p.id}`}
                  icon={<FolderKanban size={18} />}
                  label={p.name}
                  collapsed={collapsed}
                  location={location}
                  badge={p.myRole}
                />
              ))}
            </>
          )}
        </nav>

        {/* Footer */}
        <div style={{
          borderTop: '1px solid var(--border)',
          padding: '12px 8px',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px', borderRadius: 8, marginBottom: 4,
            overflow: 'hidden',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-dim) 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.75rem',
              color: '#000', flexShrink: 0,
            }}>{initials}</div>
            {!collapsed && (
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div style={{
                  fontSize: '0.8rem', fontWeight: 500,
                  color: 'var(--text-primary)', overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {user?.email || 'User'}
                </div>
                {isAdmin && (
                  <div style={{
                    fontSize: '0.65rem', color: 'var(--accent)',
                    fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>Admin</div>
                )}
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            title="Logout"
            style={{
              width: '100%', display: 'flex', alignItems: 'center',
              gap: 8, padding: '8px', borderRadius: 8,
              color: 'var(--text-muted)', fontSize: '0.875rem',
              transition: 'background 0.2s, color 0.2s',
              justifyContent: collapsed ? 'center' : 'flex-start',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--danger-bg)'; e.currentTarget.style.color = 'var(--danger)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            <LogOut size={16} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <main style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-base)' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function NavItem({ to, icon, label, collapsed, location, badge }) {
  const active = location.pathname === to || (to !== '/dashboard' && location.pathname.startsWith(to))
  return (
    <Link
      to={to}
      title={collapsed ? label : ''}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px', borderRadius: 8, marginBottom: 2,
        color: active ? 'var(--accent)' : 'var(--text-secondary)',
        background: active ? 'var(--accent-subtle)' : 'transparent',
        textDecoration: 'none', fontSize: '0.875rem', fontWeight: active ? 600 : 400,
        transition: 'background 0.15s, color 0.15s',
        overflow: 'hidden', whiteSpace: 'nowrap',
        position: 'relative',
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' } }}
    >
      {active && !collapsed && (
        <div style={{
          position: 'absolute', left: 0, top: 6, bottom: 6,
          width: 3, borderRadius: 99, background: 'var(--accent)',
        }} />
      )}
      <span style={{ flexShrink: 0, paddingLeft: active && !collapsed ? 8 : 0 }}>{icon}</span>
      {!collapsed && (
        <>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
          {badge && (
            <span style={{
              fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.06em', padding: '2px 5px', borderRadius: 4,
              background: badge === 'OWNER' ? 'var(--accent-subtle)' :
                         badge === 'MEMBER' ? 'var(--info-bg)' : 'var(--bg-overlay)',
              color: badge === 'OWNER' ? 'var(--accent)' :
                     badge === 'MEMBER' ? 'var(--info)' : 'var(--text-muted)',
            }}>{badge}</span>
          )}
        </>
      )}
    </Link>
  )
}