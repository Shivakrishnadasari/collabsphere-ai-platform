import { useState, useEffect } from 'react'
import { projectService } from '../api/index.js'
import { useAuth } from '../context/AuthContext.jsx'
import toast from 'react-hot-toast'
import { Plus, FolderKanban, Users, Calendar, Crown, Eye, User, X, Loader } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const ROLE_CONFIG = {
  OWNER:  { color: 'var(--accent)',     bg: 'var(--accent-subtle)', icon: Crown },
  MEMBER: { color: 'var(--info)',       bg: 'var(--info-bg)',       icon: User  },
  VIEWER: { color: 'var(--text-muted)', bg: 'var(--bg-overlay)',    icon: Eye   },
}

export default function DashboardPage({ onSelectProject }) {
  const { user, isAdmin } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const fetchProjects = () => {
    setLoading(true)
    projectService.getAll()
      .then(r => setProjects(r.data))
      .catch(() => toast.error('Failed to load projects'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchProjects() }, [])

  return (
    <div style={{ padding: '40px 48px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 40 }}>
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <h1 style={{ marginBottom: 6 }}>Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            {isAdmin ? 'Admin view — all projects' : `${projects.length} project${projects.length !== 1 ? 's' : ''} you're part of`}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--accent)', color: '#000', border: 'none',
            borderRadius: 10, padding: '10px 18px',
            fontWeight: 700, fontFamily: 'var(--font-display)',
            fontSize: '0.875rem', cursor: 'pointer',
            transition: 'transform 0.15s, box-shadow 0.15s',
            animation: 'fadeIn 0.3s ease 0.1s both',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-accent)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
        >
          <Plus size={18} /> New Project
        </button>
      </div>

      {/* Stats row */}
      {!loading && projects.length > 0 && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16,
          marginBottom: 36, animation: 'fadeIn 0.3s ease 0.05s both',
        }}>
          <StatCard label="Total Projects" value={projects.length}                                    icon={<FolderKanban size={20} />} />
          <StatCard label="As Owner"        value={projects.filter(p => p.myRole === 'OWNER').length}  icon={<Crown size={20} />}        color="var(--accent)" />
          <StatCard label="As Member"       value={projects.filter(p => p.myRole === 'MEMBER').length} icon={<Users size={20} />}        color="var(--info)"   />
        </div>
      )}

      {/* Projects grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: 160, borderRadius: 12 }} />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState onNew={() => setShowModal(true)} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {projects.map((p, i) => (
            <ProjectCard
              key={p.id}
              project={p}
              index={i}
              onClick={() => onSelectProject(p)}         // ✅ pass full project object
              onAddTask={() => onSelectProject(p)}       // ✅ Add Task opens the project too
            />
          ))}
        </div>
      )}

      {showModal && (
        <NewProjectModal
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); fetchProjects() }}
        />
      )}
    </div>
  )
}

function StatCard({ label, value, icon, color = 'var(--text-secondary)' }) {
  return (
    <div style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '20px 24px',
      display: 'flex', alignItems: 'center', gap: 16,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10,
        background: 'var(--bg-overlay)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color,
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-display)', lineHeight: 1, color }}>{value}</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 3 }}>{label}</div>
      </div>
    </div>
  )
}

function ProjectCard({ project, index, onClick, onAddTask }) {
  const role = ROLE_CONFIG[project.myRole] || ROLE_CONFIG.VIEWER
  const RoleIcon = role.icon
  const created = project.createdAt
    ? formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })
    : ''

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '24px', cursor: 'pointer',
        transition: 'border-color 0.2s, transform 0.2s, box-shadow 0.2s',
        animation: `fadeIn 0.3s ease ${index * 0.05}s both`,
        position: 'relative',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--border-light)'
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = 'var(--shadow-md)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.transform = 'none'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 9,
          background: 'var(--accent-subtle)', border: '1px solid var(--accent-glow)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--accent)',
        }}>
          <FolderKanban size={20} />
        </div>
        <span style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: role.bg, color: role.color,
          fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.06em', padding: '3px 8px', borderRadius: 99,
        }}>
          <RoleIcon size={10} /> {project.myRole}
        </span>
      </div>

      <h3 style={{ fontSize: '1.05rem', marginBottom: 6, color: 'var(--text-primary)' }}>{project.name}</h3>
      {project.description && (
        <p style={{
          color: 'var(--text-secondary)', fontSize: '0.875rem',
          lineHeight: 1.5, marginBottom: 16,
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>{project.description}</p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.78rem' }}>
          <Calendar size={12} />
          <span>Created {created}</span>
        </div>

        {/* ── Add Task button ───────────────────────────── */}
        {(project.myRole === 'OWNER' || project.myRole === 'MEMBER') && (
          <button
            onClick={e => { e.stopPropagation(); onAddTask() }}  // stopPropagation so card click doesn't also fire
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'var(--accent)', color: '#000',
              border: 'none', borderRadius: 7,
              padding: '5px 11px', fontSize: '0.75rem',
              fontWeight: 700, cursor: 'pointer',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <Plus size={12} /> Add Task
          </button>
        )}
      </div>
    </div>
  )
}

function EmptyState({ onNew }) {
  return (
    <div style={{ textAlign: 'center', padding: '80px 24px', animation: 'fadeIn 0.4s ease' }}>
      <div style={{
        width: 72, height: 72, borderRadius: 16,
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 20px', color: 'var(--text-muted)',
      }}><FolderKanban size={32} /></div>
      <h3 style={{ marginBottom: 8 }}>No projects yet</h3>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: '0.95rem' }}>
        Create your first project and start collaborating
      </p>
      <button
        onClick={onNew}
        style={{
          background: 'var(--accent)', color: '#000', border: 'none',
          borderRadius: 10, padding: '10px 24px',
          fontWeight: 700, fontFamily: 'var(--font-display)',
          fontSize: '0.875rem', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 8,
        }}
      ><Plus size={16} /> New Project</button>
    </div>
  )
}

function NewProjectModal({ onClose, onCreated }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!name.trim()) { setError('Project name is required'); return }
    setLoading(true)
    try {
      await projectService.create(name.trim(), description.trim())
      toast.success(`"${name}" created!`)
      onCreated()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create project')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(4px)', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 24, animation: 'fadeIn 0.2s ease',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: 16, padding: '32px', width: '100%', maxWidth: 480,
        animation: 'fadeIn 0.25s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h3 style={{ fontSize: '1.2rem' }}>New Project</h3>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', padding: 4, borderRadius: 6 }}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
              Project Name *
            </label>
            <input
              value={name} onChange={e => { setName(e.target.value); setError('') }}
              placeholder="e.g. Customer Portal" autoFocus
              style={{ width: '100%', height: 42, padding: '0 14px', borderRadius: 8, boxSizing: 'border-box', border: `1px solid ${error ? 'var(--danger)' : 'var(--border)'}`, background: 'var(--bg-elevated)', fontSize: '0.9rem', color: 'var(--text-primary)' }}
            />
            {error && <p style={{ marginTop: 4, fontSize: '0.8rem', color: 'var(--danger)' }}>{error}</p>}
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Description</label>
            <textarea
              value={description} onChange={e => setDescription(e.target.value)}
              placeholder="What's this project about?" rows={3}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, boxSizing: 'border-box', border: '1px solid var(--border)', background: 'var(--bg-elevated)', fontSize: '0.9rem', resize: 'vertical', minHeight: 80, color: 'var(--text-primary)' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, height: 42, borderRadius: 8, border: '1px solid var(--border)',
              color: 'var(--text-secondary)', background: 'transparent', fontSize: '0.875rem', cursor: 'pointer',
            }}>Cancel</button>
            <button type="submit" disabled={loading} style={{
              flex: 2, height: 42, borderRadius: 8, border: 'none',
              background: 'var(--accent)', color: '#000',
              fontWeight: 700, fontSize: '0.875rem', cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              {loading ? <><Loader size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> Creating…</> : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}