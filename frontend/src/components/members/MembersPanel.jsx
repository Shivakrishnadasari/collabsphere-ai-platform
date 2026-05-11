import { useState } from 'react'
import { projectService } from '../../api/index.js'
import { useAuth } from '../../context/AuthContext.jsx'
import toast from 'react-hot-toast'
import { UserPlus, Crown, User, Eye, X, Loader } from 'lucide-react'

const ROLES = ['OWNER', 'MEMBER', 'VIEWER']
const RI = {
  OWNER:  { Icon: Crown, color: 'var(--accent)',     bg: 'var(--accent-subtle)' },
  MEMBER: { Icon: User,  color: 'var(--info)',       bg: 'var(--info-bg)' },
  VIEWER: { Icon: Eye,   color: 'var(--text-muted)', bg: 'var(--bg-overlay)' },
}

export default function MembersPanel({ projectId, isOwner, onRefresh }) {
  const { user } = useAuth()
  const [showAdd, setShowAdd] = useState(false)

  return (
    <div style={{ padding: '28px 32px', maxWidth: 680 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h3 style={{ marginBottom: 4 }}>Team Members</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Manage who has access to this project.</p>
        </div>
        {isOwner && (
          <button onClick={() => setShowAdd(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 9, padding: '9px 16px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
            <UserPlus size={16} /> Add Member
          </button>
        )}
      </div>

      {/* Role guide */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Role Permissions</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {ROLES.map(role => {
            const r = RI[role]; const Icon = r.Icon
            return (
              <div key={role} style={{ background: r.bg, borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                  <Icon size={13} style={{ color: r.color }} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: r.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{role}</span>
                </div>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  {role === 'OWNER' && 'Full access: manage members, create/delete tasks'}
                  {role === 'MEMBER' && 'Can create and update tasks'}
                  {role === 'VIEWER' && 'Read-only access'}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Your user ID */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Add members by their <strong style={{ color: 'var(--text-primary)' }}>User ID</strong> (UUID from the auth service).
          To remove or change roles of existing members, use the add member action and choose the user ID.
        </p>
        <div style={{ marginTop: 14, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Your User ID:</p>
          <code style={{ fontSize: '0.82rem', color: 'var(--accent)', fontFamily: 'monospace', wordBreak: 'break-all' }}>{user?.userId}</code>
        </div>
      </div>

      {showAdd && (
        <AddMemberModal projectId={projectId} onClose={() => setShowAdd(false)} onAdded={() => { setShowAdd(false); onRefresh() }} />
      )}
    </div>
  )
}

function AddMemberModal({ projectId, onClose, onAdded }) {
  const [userId, setUserId] = useState('')
  const [role, setRole] = useState('MEMBER')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleAdd = async (e) => {
    e.preventDefault()
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!userId.trim()) { setError('User ID is required'); return }
    if (!UUID_RE.test(userId.trim())) { setError('Must be a valid UUID'); return }
    setError(''); setLoading(true)
    try {
      await projectService.addMember(projectId, userId.trim(), role)
      toast.success('Member added!'); onAdded()
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to add member'
      toast.error(msg); setError(msg)
    } finally { setLoading(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 440, animation: 'fadeIn 0.2s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: '1.05rem' }}>Add Member</h3>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', display: 'flex', padding: 4, borderRadius: 6 }}><X size={18} /></button>
        </div>
        <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 5, fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>User ID (UUID)</label>
            <input value={userId} onChange={e => setUserId(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" autoFocus
              style={{ width: '100%', height: 42, padding: '0 14px', borderRadius: 8, boxSizing: 'border-box', fontFamily: 'monospace', border: '1px solid ' + (error ? 'var(--danger)' : 'var(--border)'), background: 'var(--bg-elevated)', fontSize: '0.83rem' }} />
            {error && <p style={{ marginTop: 4, fontSize: '0.8rem', color: 'var(--danger)' }}>{error}</p>}
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 5, fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Role</label>
            <select value={role} onChange={e => setRole(e.target.value)} style={{ width: '100%', height: 42, padding: '0 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-elevated)', boxSizing: 'border-box', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
              <option value="OWNER">Owner — Full access</option>
              <option value="MEMBER">Member — Can create tasks</option>
              <option value="VIEWER">Viewer — Read only</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, height: 42, borderRadius: 8, border: '1px solid var(--border)', color: 'var(--text-secondary)', background: 'transparent', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={loading} style={{ flex: 2, height: 42, borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#000', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {loading ? <><Loader size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> Adding…</> : <><UserPlus size={14} /> Add Member</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}