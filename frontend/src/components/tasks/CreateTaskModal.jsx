import { useState } from 'react'
import { taskService } from '../../api/index.js'
import toast from 'react-hot-toast'
import { X, Loader } from 'lucide-react'

export default function CreateTaskModal({ projectId, onClose, onCreated }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required'); return }
    setError('')
    setLoading(true)
    try {
      await taskService.create(projectId, { title: title.trim(), description: description.trim() || null })
      toast.success('Task created!')
      onCreated()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create task')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24, animation: 'fadeIn 0.2s ease' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '28px', width: '100%', maxWidth: 460, animation: 'fadeIn 0.25s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <h3 style={{ fontSize: '1.1rem' }}>New Task</h3>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', padding: 4, borderRadius: 6, display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
              Task Title <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Implement login page"
              autoFocus
              style={{
                width: '100%', height: 42, padding: '0 14px',
                borderRadius: 8, boxSizing: 'border-box',
                border: '1px solid ' + (error ? 'var(--danger)' : 'var(--border)'),
                background: 'var(--bg-elevated)', fontSize: '0.9rem',
              }}
            />
            {error && <p style={{ marginTop: 4, fontSize: '0.8rem', color: 'var(--danger)' }}>{error}</p>}
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional — describe what needs to be done"
              rows={4}
              style={{
                width: '100%', padding: '10px 14px',
                borderRadius: 8, boxSizing: 'border-box',
                border: '1px solid var(--border)',
                background: 'var(--bg-elevated)', fontSize: '0.9rem',
                resize: 'vertical', minHeight: 90,
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button
              type="button" onClick={onClose}
              style={{ flex: 1, height: 42, borderRadius: 8, border: '1px solid var(--border)', color: 'var(--text-secondary)', background: 'transparent', fontSize: '0.875rem', cursor: 'pointer' }}
            >Cancel</button>
            <button
              type="submit" disabled={loading}
              style={{ flex: 2, height: 42, borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#000', fontWeight: 700, fontSize: '0.875rem', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              {loading ? <><Loader size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> Creating…</> : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}