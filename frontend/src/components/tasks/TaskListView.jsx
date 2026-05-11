import { useState, useEffect } from 'react'
import { taskService } from '../../api/index.js'
import toast from 'react-hot-toast'
import { Trash2, Edit3, ChevronLeft, ChevronRight, Filter } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const STATUS_STYLES = {
  TODO:        { color: 'var(--todo-color)',     bg: 'var(--todo-bg)',      label: 'To Do' },
  IN_PROGRESS: { color: 'var(--progress-color)', bg: 'var(--progress-bg)', label: 'In Progress' },
  DONE:        { color: 'var(--done-color)',     bg: 'var(--done-bg)',      label: 'Done' },
}

export default function TaskListView({ projectId, canEdit, isOwner, onRefresh, myUserId }) {
  const [tasks, setTasks] = useState([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [editTask, setEditTask] = useState(null)

  const fetchTasks = (pg = page, st = status) => {
    setLoading(true)
    const params = { page: pg, size: 10, sortBy: 'createdAt', direction: 'desc' }
    if (st) params.status = st
    taskService.getList(projectId, params)
      .then(r => {
        setTasks(r.data.content || [])
        setTotalPages(r.data.totalPages || 0)
        setTotal(r.data.totalElements || 0)
      })
      .catch(() => toast.error('Failed to load tasks'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchTasks(0, status) }, [projectId])

  const changeFilter = (s) => {
    setStatus(s)
    setPage(0)
    fetchTasks(0, s)
  }

  const changePage = (p) => {
    setPage(p)
    fetchTasks(p, status)
  }

  const deleteTask = async (task) => {
    if (!window.confirm('Delete "' + task.title + '"?')) return
    try { await taskService.delete(projectId, task.id); toast.success('Deleted'); fetchTasks() }
    catch (err) { toast.error(err.response?.data?.error || 'Delete failed') }
  }

  return (
    <div style={{ padding: '24px 32px', height: '100%', overflow: 'auto', boxSizing: 'border-box' }}>
      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Filter size={14} /> Filter:
        </span>
        {['', 'TODO', 'IN_PROGRESS', 'DONE'].map(s => (
          <button key={s} onClick={() => changeFilter(s)} style={{
            padding: '5px 12px', borderRadius: 99, fontSize: '0.8rem', fontWeight: 500,
            border: '1px solid ' + (status === s ? 'var(--accent)' : 'var(--border)'),
            background: status === s ? 'var(--accent-subtle)' : 'transparent',
            color: status === s ? 'var(--accent)' : 'var(--text-secondary)',
            cursor: 'pointer',
          }}>
            {s === '' ? 'All' : STATUS_STYLES[s]?.label}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
          {total} task{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 56, borderRadius: 8 }} />)}
        </div>
      ) : tasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '0.95rem' }}>No tasks found</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {tasks.map((task, i) => {
            const ss = STATUS_STYLES[task.status] || STATUS_STYLES.TODO
            const canMod = isOwner || task.createdBy === myUserId
            const ago = task.createdAt ? formatDistanceToNow(new Date(task.createdAt), { addSuffix: true }) : ''
            return (
              <div key={task.id} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                background: 'var(--bg-surface)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '12px 16px',
                animation: 'fadeIn 0.25s ease ' + (i * 0.03) + 's both',
                transition: 'border-color 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-light)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                {/* Status badge */}
                <span style={{ flexShrink: 0, background: ss.bg, color: ss.color, borderRadius: 99, padding: '3px 10px', fontSize: '0.73rem', fontWeight: 700 }}>
                  {ss.label}
                </span>

                {/* Title + description */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</p>
                  {task.description && (
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{task.description}</p>
                  )}
                </div>

                {/* Meta */}
                {ago && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', flexShrink: 0 }}>{ago}</span>}

                {/* Actions */}
                {canMod && (
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <IconBtn icon={<Edit3 size={14} />} onClick={() => setEditTask(task)} title="Edit" />
                    {isOwner && <IconBtn icon={<Trash2 size={14} />} onClick={() => deleteTask(task)} title="Delete" danger />}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 24 }}>
          <button disabled={page === 0} onClick={() => changePage(page - 1)} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'transparent', color: page === 0 ? 'var(--text-muted)' : 'var(--text-secondary)',
            fontSize: '0.85rem', cursor: page === 0 ? 'not-allowed' : 'pointer',
          }}>
            <ChevronLeft size={15} /> Prev
          </button>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Page {page + 1} of {totalPages}
          </span>
          <button disabled={page >= totalPages - 1} onClick={() => changePage(page + 1)} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'transparent', color: page >= totalPages - 1 ? 'var(--text-muted)' : 'var(--text-secondary)',
            fontSize: '0.85rem', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
          }}>
            Next <ChevronRight size={15} />
          </button>
        </div>
      )}

      {editTask && (
        <EditModal
          projectId={projectId} task={editTask}
          onClose={() => setEditTask(null)}
          onSaved={() => { setEditTask(null); fetchTasks() }}
        />
      )}
    </div>
  )
}

function IconBtn({ icon, onClick, title, danger }) {
  return (
    <button onClick={onClick} title={title} style={{
      width: 30, height: 30, borderRadius: 7, border: '1px solid var(--border)',
      background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: danger ? 'var(--danger)' : 'var(--text-muted)', cursor: 'pointer',
      transition: 'background 0.15s, color 0.15s',
    }}
      onMouseEnter={e => { e.currentTarget.style.background = danger ? 'var(--danger-bg)' : 'var(--bg-hover)'; e.currentTarget.style.color = danger ? 'var(--danger)' : 'var(--text-primary)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = danger ? 'var(--danger)' : 'var(--text-muted)' }}
    >{icon}</button>
  )
}

function EditModal({ projectId, task, onClose, onSaved }) {
  const [title, setTitle] = useState(task.title || '')
  const [desc, setDesc] = useState(task.description || '')
  const [status, setStatus] = useState(task.status || 'TODO')
  const [busy, setBusy] = useState(false)
  const save = async (e) => {
    e.preventDefault(); if (!title.trim()) return; setBusy(true)
    try {
      await taskService.update(projectId, task.id, { title, description: desc, status, version: task.version ?? 0 })
      toast.success('Task saved'); onSaved()
    } catch (err) { toast.error(err.response?.data?.error || 'Update failed') }
    finally { setBusy(false) }
  }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 440, animation: 'fadeIn 0.2s ease' }}>
        <h3 style={{ marginBottom: 20 }}>Edit Task</h3>
        <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <FieldWrap label="Title"><input value={title} onChange={e => setTitle(e.target.value)} style={{ width: '100%', height: 40, padding: '0 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-elevated)', boxSizing: 'border-box', fontSize: '0.9rem' }} /></FieldWrap>
          <FieldWrap label="Description"><textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-elevated)', boxSizing: 'border-box', fontSize: '0.87rem', resize: 'vertical' }} /></FieldWrap>
          <FieldWrap label="Status">
            <select value={status} onChange={e => setStatus(e.target.value)} style={{ width: '100%', height: 40, padding: '0 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-elevated)', boxSizing: 'border-box', fontSize: '0.88rem', color: 'var(--text-primary)' }}>
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="DONE">Done</option>
            </select>
          </FieldWrap>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, height: 40, borderRadius: 8, border: '1px solid var(--border)', color: 'var(--text-secondary)', background: 'transparent', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={busy} style={{ flex: 2, height: 40, borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#000', fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.7 : 1 }}>{busy ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function FieldWrap({ label, children }) {
  return <div><label style={{ display: 'block', marginBottom: 5, fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</label>{children}</div>
}