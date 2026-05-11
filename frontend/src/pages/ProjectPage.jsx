import { useState, useEffect } from 'react'
import { projectService, taskService } from '../api/index.js'
import { useAuth } from '../context/AuthContext.jsx'
import toast from 'react-hot-toast'
import { Layers, Users, List, Plus, ArrowLeft, BarChart2 } from 'lucide-react'
import KanbanBoard from '../components/tasks/KanbanBoard.jsx'
import TaskListView from '../components/tasks/TaskListView.jsx'
import CreateTaskModal from '../components/tasks/CreateTaskModal.jsx'
import MembersPanel from '../components/members/MembersPanel.jsx'
import AIAssistant from '../components/ai/AIAssistant'
import AnalyticsDashboard from '../components/analytics/AnalyticsDashboard'

export default function ProjectPage({ project: projectProp, onBack }) {
  const projectId = projectProp?.id
  const { user, isAdmin } = useAuth()
  const [project, setProject]       = useState(null)
  const [myRole, setMyRole]         = useState(null)
  const [boardData, setBoardData]   = useState(null)
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState('board')
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const refresh = () => setRefreshKey(k => k + 1)

  useEffect(() => {
    if (!projectId) return
    setLoading(true)
    Promise.all([projectService.getAll(), taskService.getBoard(projectId)])
      .then(([pRes, bRes]) => {
        const found = pRes.data.find(p => p.id === projectId)
        setProject(found || { id: projectId, name: projectProp?.name || 'Project' })
        setMyRole(found?.myRole || null)
        setBoardData(bRes.data)
      })
      .catch(() => toast.error('Failed to load project'))
      .finally(() => setLoading(false))
  }, [projectId, refreshKey])

  // ── Role helpers — TEAM_LEAD added everywhere ──────────────
  const canEdit  = isAdmin
    || myRole === 'OWNER'
    || myRole === 'TEAM_LEAD'
    || myRole === 'MEMBER'

  const canManage = isAdmin           // can invite, change roles
    || myRole === 'OWNER'
    || myRole === 'TEAM_LEAD'

  const isOwner = isAdmin || myRole === 'OWNER'

  const handleTasksCreated = () => {
    setTab('board')
    refresh()
  }

  if (!projectId) return null

  if (loading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%' }}>
        <div style={{ width:32, height:32, border:'3px solid var(--border)', borderTopColor:'var(--accent)', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>
      <ProjectHeader
        project={project}
        myRole={myRole}
        tab={tab}
        setTab={setTab}
        canEdit={canEdit}
        onBack={onBack}
        onAddTask={() => setShowCreateTask(true)}
      />
      <div style={{ flex:1, overflow:'hidden' }}>
        {tab === 'board'     && <KanbanBoard     key={refreshKey} projectId={projectId} boardData={boardData} canEdit={canEdit} isOwner={isOwner} onRefresh={refresh} myUserId={user?.userId} />}
        {tab === 'list'      && <TaskListView    projectId={projectId} canEdit={canEdit} isOwner={isOwner} onRefresh={refresh} myUserId={user?.userId} />}
        {tab === 'analytics' && <AnalyticsDashboard project={{ id: projectId, ...project }} />}
        {tab === 'members'   && (
          <MembersPanel
            project={{ id: projectId, ...project }}
            currentUserId={user?.userId}
            currentUserRole={myRole}
          />
        )}
      </div>
      {showCreateTask && (
        <CreateTaskModal
          projectId={projectId}
          onClose={() => setShowCreateTask(false)}
          onCreated={() => { setShowCreateTask(false); refresh() }}
        />
      )}
      <AIAssistant project={{ id: projectId, ...project }} onTasksCreated={handleTasksCreated} />
    </div>
  )
}

function ProjectHeader({ project, myRole, tab, setTab, canEdit, onBack, onAddTask }) {
  const tabs = [
    { id: 'board',     label: 'Board',     Icon: Layers    },
    { id: 'list',      label: 'List',      Icon: List      },
    { id: 'analytics', label: 'Analytics', Icon: BarChart2 },
    { id: 'members',   label: 'Members',   Icon: Users     },
  ]

  // ── TEAM_LEAD added to role color map ──────────────────────
  const roleColors = {
    OWNER:     { bg: 'var(--accent-subtle)', color: 'var(--accent)'     },
    TEAM_LEAD: { bg: '#8b5cf615',            color: '#8b5cf6'           },
    MEMBER:    { bg: 'var(--info-bg)',        color: 'var(--info)'       },
    VIEWER:    { bg: 'var(--bg-overlay)',     color: 'var(--text-muted)' },
  }
  const rc = myRole ? roleColors[myRole] || roleColors.VIEWER : null

  return (
    <div style={{ padding:'24px 32px 0', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button onClick={onBack}
            style={{ color:'var(--text-muted)', padding:6, borderRadius:8, background:'none', border:'none', cursor:'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.color='var(--text-primary)'; e.currentTarget.style.background='var(--bg-hover)' }}
            onMouseLeave={e => { e.currentTarget.style.color='var(--text-muted)'; e.currentTarget.style.background='none' }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 style={{ marginBottom:2, fontSize:'1.25rem' }}>{project?.name}</h2>
          </div>
          {rc && (
            <span style={{ fontSize:'0.65rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', padding:'3px 8px', borderRadius:99, background:rc.bg, color:rc.color }}>
              {myRole?.replace('_', ' ')}
            </span>
          )}
        </div>
        {canEdit && tab !== 'members' && tab !== 'analytics' && (
          <button onClick={onAddTask}
            style={{ display:'flex', alignItems:'center', gap:7, background:'var(--accent)', color:'#000', border:'none', borderRadius:9, padding:'9px 16px', fontWeight:700, fontSize:'0.85rem', cursor:'pointer' }}>
            <Plus size={16} /> Add Task
          </button>
        )}
      </div>
      <div style={{ display:'flex', gap:2 }}>
        {tabs.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setTab(id)} style={{
            display:'flex', alignItems:'center', gap:7, padding:'9px 16px',
            borderRadius:'8px 8px 0 0', fontSize:'0.875rem',
            fontWeight: tab === id ? 600 : 400,
            color: tab === id ? 'var(--text-primary)' : 'var(--text-muted)',
            background:'none', border:'none', cursor:'pointer',
            borderBottom: tab === id ? '2px solid var(--accent)' : '2px solid transparent',
          }}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>
    </div>
  )
}