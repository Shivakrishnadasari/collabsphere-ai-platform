import { useState, useEffect, useRef, useCallback } from 'react'
import { taskService } from '../../api/index.js'
import toast from 'react-hot-toast'
import { MoreHorizontal, User, Clock, Wifi, WifiOff } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const COLS = [
  { status: 'TODO', label: 'To Do', color: 'var(--todo-color)', bg: 'var(--todo-bg)' },
  { status: 'IN_PROGRESS', label: 'In Progress', color: 'var(--progress-color)', bg: 'var(--progress-bg)' },
  { status: 'DONE', label: 'Done', color: 'var(--done-color)', bg: 'var(--done-bg)' },
]

// ── WebSocket hook (no separate file needed) ──────────────────────────────────
function useProjectSocket(projectId, onEvent) {
  const clientRef = useRef(null)
  const [connected, setConnected] = useState(false)

  const connect = useCallback(() => {
    const token = localStorage.getItem('accessToken')
    if (!token || !projectId) return

    Promise.all([
      import('sockjs-client'),
      import('@stomp/stompjs'),
    ]).then(([{ default: SockJS }, { Client }]) => {
      const client = new Client({
        webSocketFactory: () => new SockJS(`http://localhost:8082/ws?token=${token}`),
        onConnect: () => {
          setConnected(true)
          client.subscribe(`/topic/project/${projectId}`, (msg) => {
            try { onEvent?.(JSON.parse(msg.body)) }
            catch { console.warn('[ws] bad message:', msg.body) }
          })
        },
        onDisconnect: () => setConnected(false),
        onStompError:  () => setConnected(false),
        reconnectDelay: 5000,
      })
      client.activate()
      clientRef.current = client
    }).catch(() => {
      console.warn('[ws] Run: npm install sockjs-client @stomp/stompjs')
    })
  }, [projectId])

  useEffect(() => {
    connect()
    return () => { clientRef.current?.deactivate(); setConnected(false) }
  }, [connect])

  return connected
}

// ── Main Board ────────────────────────────────────────────────────────────────
export default function KanbanBoard({ projectId, boardData, canEdit, isOwner, onRefresh, myUserId }) {
  const [colMap, setColMap] = useState({})
  const [dragging, setDragging] = useState(null)
  const [dragOver, setDragOver] = useState(null)
  const [editTask, setEditTask] = useState(null)

  useEffect(() => {
    if (!boardData) return
    const m = {}
    boardData.columns?.forEach(c => { m[c.status] = c.tasks || [] })
    setColMap(m)
  }, [boardData])

  // ── Live updates ──────────────────────────────────────────
  const connected = useProjectSocket(projectId, (event) => {
    if (['TASK_CREATED', 'TASK_UPDATED', 'TASK_DELETED', 'TASK_MOVED'].includes(event.type)) {
      onRefresh()
    }
  })

  const handleDrop = async (e, toStatus) => {
    e.preventDefault()
    setDragOver(null)
    if (!dragging || !canEdit || dragging.fromStatus === toStatus) {
      setDragging(null)
      return
    }
    const { task } = dragging
    setDragging(null)
    const col = colMap[toStatus] || []
    const newPos = col.length > 0 ? (col[col.length - 1].position || col.length * 1000) + 1000 : 1000
    try {
      await taskService.move(projectId, task.id, {
        newStatus: toStatus, newPosition: newPos, version: task.version ?? 0,
      })
      toast.success('Task moved')
      onRefresh()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Move failed')
    }
  }

  const deleteTask = async (task) => {
    if (!window.confirm('Delete "' + task.title + '"?')) return
    try {
      await taskService.delete(projectId, task.id)
      toast.success('Deleted')
      onRefresh()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Live indicator */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '4px 32px 0', fontSize: '0.72rem', fontWeight: 600,
        color: connected ? 'var(--done-color)' : 'var(--text-muted)',
      }}>
        {connected
          ? <><Wifi size={11} /> Live</>
          : <><WifiOff size={11} /> Connecting…</>
        }
      </div>

      {/* Columns */}
      <div style={{
        display: 'flex', gap: 16, padding: '12px 32px 24px',
        flex: 1, overflow: 'auto', alignItems: 'flex-start', boxSizing: 'border-box',
      }}>
        {COLS.map(col => {
          const tasks = colMap[col.status] || []
          const over = dragOver === col.status
          return (
            <KanbanColumn
              key={col.status}
              col={col} tasks={tasks} over={over}
              canEdit={canEdit} isOwner={isOwner} myUserId={myUserId}
              draggingId={dragging?.task?.id}
              onDragOver={e => { if (canEdit) { e.preventDefault(); setDragOver(col.status) } }}
              onDragLeave={() => setDragOver(null)}
              onDrop={e => canEdit && handleDrop(e, col.status)}
              onDragStart={(task) => setDragging({ task, fromStatus: col.status })}
              onEdit={task => setEditTask(task)}
              onDelete={deleteTask}
            />
          )
        })}
        {editTask && (
          <EditModal
            projectId={projectId} task={editTask}
            onClose={() => setEditTask(null)}
            onSaved={() => { setEditTask(null); onRefresh() }}
          />
        )}
      </div>
    </div>
  )
}

function KanbanColumn({ col, tasks, over, canEdit, isOwner, myUserId, draggingId, onDragOver, onDragLeave, onDrop, onDragStart, onEdit, onDelete }) {
  return (
    <div
      onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
      style={{
        flex: '1 1 0', minWidth: 265, maxWidth: 350,
        display: 'flex', flexDirection: 'column',
        background: over ? col.bg : 'var(--bg-surface)',
        border: '1px solid ' + (over ? col.color : 'var(--border)'),
        borderRadius: 12, overflow: 'hidden',
        transition: 'border-color 0.2s, background 0.2s', minHeight: 180,
      }}
    >
      <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.88rem', color: col.color }}>{col.label}</span>
        <span style={{ marginLeft: 'auto', background: col.bg, color: col.color, borderRadius: 99, padding: '1px 8px', fontSize: '0.73rem', fontWeight: 700 }}>{tasks.length}</span>
      </div>
      <div style={{ flex: 1, padding: '10px', display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
        {tasks.map(t => (
          <TaskCard
            key={t.id} task={t} color={col.color}
            canEdit={canEdit} isOwner={isOwner} myUserId={myUserId}
            isDragging={draggingId === t.id}
            onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; onDragStart(t) }}
            onEdit={() => onEdit(t)} onDelete={() => onDelete(t)}
          />
        ))}
        {tasks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-muted)', fontSize: '0.8rem', border: '2px dashed var(--border)', borderRadius: 8, opacity: over ? 0.9 : 0.45 }}>
            {over ? 'Drop here' : 'No tasks yet'}
          </div>
        )}
      </div>
    </div>
  )
}

function TaskCard({ task, color, canEdit, isOwner, myUserId, isDragging, onDragStart, onEdit, onDelete }) {
  const [menu, setMenu] = useState(false)
  const canMod = isOwner || task.createdBy === myUserId
  const ago = task.createdAt
    ? formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })
    : ''
  return (
    <div
      draggable={canEdit} onDragStart={canEdit ? onDragStart : undefined}
      style={{
        background: 'var(--bg-elevated)', border: '1px solid var(--border)',
        borderRadius: 10, padding: '12px 14px',
        cursor: canEdit ? 'grab' : 'default',
        opacity: isDragging ? 0.35 : 1, position: 'relative',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; setMenu(false) }}
    >
      <div style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, borderRadius: '0 2px 2px 0', background: color }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingLeft: 8 }}>
        <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.4, flex: 1, marginRight: 6 }}>{task.title}</p>
        {canMod && (
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button onClick={() => setMenu(v => !v)} style={{ color: 'var(--text-muted)', padding: 2, borderRadius: 4, display: 'flex' }}>
              <MoreHorizontal size={15} />
            </button>
            {menu && (
              <div style={{ position: 'absolute', right: 0, top: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: 4, minWidth: 110, zIndex: 100, boxShadow: 'var(--shadow-md)' }}>
                <MBtn onClick={() => { setMenu(false); onEdit() }}>Edit</MBtn>
                {isOwner && <MBtn danger onClick={() => { setMenu(false); onDelete() }}>Delete</MBtn>}
              </div>
            )}
          </div>
        )}
      </div>
      {task.description && (
        <p style={{ fontSize: '0.77rem', color: 'var(--text-muted)', marginTop: 5, paddingLeft: 8, lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{task.description}</p>
      )}
      <div style={{ display: 'flex', alignItems: 'center', marginTop: 8, paddingLeft: 8 }}>
        {task.assignedTo && <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.7rem', color: 'var(--text-muted)' }}><User size={10} /> Assigned</span>}
        {ago && <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 'auto' }}><Clock size={10} /> {ago}</span>}
      </div>
    </div>
  )
}

function MBtn({ children, onClick, danger }) {
  return (
    <button onClick={onClick}
      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 10px', borderRadius: 5, fontSize: '0.82rem', color: danger ? 'var(--danger)' : 'var(--text-secondary)', background: 'transparent', transition: 'background 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.background = danger ? 'var(--danger-bg)' : 'var(--bg-hover)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >{children}</button>
  )
}

function EditModal({ projectId, task, onClose, onSaved }) {
  const [title, setTitle] = useState(task.title || '')
  const [desc, setDesc] = useState(task.description || '')
  const [status, setStatus] = useState(task.status || 'TODO')
  const [busy, setBusy] = useState(false)
  const save = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    setBusy(true)
    try {
      await taskService.update(projectId, task.id, { title, description: desc, status, version: task.version ?? 0 })
      toast.success('Task saved')
      onSaved()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 440, animation: 'fadeIn 0.2s ease' }}>
        <h3 style={{ marginBottom: 20 }}>Edit Task</h3>
        <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <F label="Title"><input value={title} onChange={e => setTitle(e.target.value)} style={{ width: '100%', height: 40, padding: '0 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-elevated)', boxSizing: 'border-box', fontSize: '0.9rem', color: 'var(--text-primary)' }} /></F>
          <F label="Description"><textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-elevated)', boxSizing: 'border-box', fontSize: '0.87rem', resize: 'vertical', color: 'var(--text-primary)' }} /></F>
          <F label="Status">
            <select value={status} onChange={e => setStatus(e.target.value)} style={{ width: '100%', height: 40, padding: '0 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-elevated)', boxSizing: 'border-box', fontSize: '0.88rem', color: 'var(--text-primary)' }}>
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="DONE">Done</option>
            </select>
          </F>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, height: 40, borderRadius: 8, border: '1px solid var(--border)', color: 'var(--text-secondary)', background: 'transparent', fontSize: '0.875rem', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={busy} style={{ flex: 2, height: 40, borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#000', fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.7 : 1 }}>{busy ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function F({ label, children }) {
  return <div><label style={{ display: 'block', marginBottom: 5, fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</label>{children}</div>
}