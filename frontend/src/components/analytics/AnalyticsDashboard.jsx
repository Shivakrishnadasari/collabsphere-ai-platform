import { useState, useEffect, useRef } from 'react';
import { taskService } from '../../api/index.js';

function BarChart({ data, color = '#6366f1', height = 80 }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data?.length) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.offsetWidth;
    const h = height;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    const max = Math.max(...data.map(d => d.value), 1);
    const gap = 4;
    const barW = (w - gap * (data.length - 1)) / data.length;
    ctx.clearRect(0, 0, w, h);
    data.forEach((d, i) => {
      const barH = (d.value / max) * (h - 20);
      const x = i * (barW + gap);
      const y = h - barH - 16;
      ctx.fillStyle = d.highlight ? '#818cf8' : color + '88';
      const radius = 3;
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + barW - radius, y);
      ctx.quadraticCurveTo(x + barW, y, x + barW, y + radius);
      ctx.lineTo(x + barW, y + barH);
      ctx.lineTo(x, y + barH);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#5a5a78';
      ctx.font = '9px DM Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(d.label, x + barW / 2, h - 2);
    });
  }, [data, color, height]);
  return <canvas ref={canvasRef} style={{ width: '100%', height: `${height}px`, display: 'block' }} />;
}

function DonutChart({ segments, size = 100 }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !segments?.length) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);
    const cx = size / 2, cy = size / 2, r = size * 0.38, inner = size * 0.24;
    const total = segments.reduce((s, d) => s + d.value, 0) || 1;
    let angle = -Math.PI / 2;
    segments.forEach(seg => {
      const slice = (seg.value / total) * 2 * Math.PI;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, angle, angle + slice);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();
      angle += slice;
    });
    ctx.beginPath();
    ctx.arc(cx, cy, inner, 0, 2 * Math.PI);
    ctx.fillStyle = '#111116';
    ctx.fill();
    ctx.fillStyle = '#e8e8f0';
    ctx.font = `bold ${size * 0.16}px Syne, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(total, cx, cy);
  }, [segments, size]);
  return <canvas ref={canvasRef} style={{ width: `${size}px`, height: `${size}px` }} />;
}

export default function AnalyticsDashboard({ project }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!project?.id) return;
    setLoading(true);
    setError('');
    Promise.all([
      taskService.getList(project.id, { page: 0, size: 100 }),
      taskService.getList(project.id, { page: 1, size: 100 }),
    ])
      .then(([r0, r1]) => {
        const page0 = r0.data?.content || [];
        const page1 = r1.data?.content || [];
        setTasks([...page0, ...page1]);
      })
      .catch(e => setError(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, [project?.id]);

  if (loading) return (
    <div className="analytics-loading">
      {[1,2,3,4].map(i => <div key={i} className="skeleton-card" style={{height: 140}} />)}
    </div>
  );

  if (error) return <div className="alert alert-error">{error}</div>;

  const total      = tasks.length;
  const todo       = tasks.filter(t => t.status === 'TODO').length;
  const inProgress = tasks.filter(t => t.status === 'IN_PROGRESS').length;
  const done       = tasks.filter(t => t.status === 'DONE').length;
  const completionRate = total ? Math.round((done / total) * 100) : 0;
  const now = Date.now(), dayMs = 86400000;

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now - (6 - i) * dayMs);
    return { label: d.toLocaleDateString('en', { weekday: 'short' }), value: tasks.filter(t => new Date(t.createdAt).toDateString() === d.toDateString()).length, highlight: i === 6 };
  });

  const velocity7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now - (6 - i) * dayMs);
    return { label: d.toLocaleDateString('en', { weekday: 'short' }), value: tasks.filter(t => t.status === 'DONE' && new Date(t.createdAt).toDateString() === d.toDateString()).length, highlight: i === 6 };
  });

  const assigneeCounts = {};
  tasks.forEach(t => { if (t.assignedTo) { const key = t.assignedTo.toString().substring(0, 8); assigneeCounts[key] = (assigneeCounts[key] || 0) + 1; } });
  const unassigned   = tasks.filter(t => !t.assignedTo).length;
  const topAssignees = Object.entries(assigneeCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const donutSegments = [
    { label: 'To Do', value: todo, color: '#94a3b8' },
    { label: 'In Progress', value: inProgress, color: '#6366f1' },
    { label: 'Done', value: done, color: '#10b981' },
  ];

  const statCards = [
    { label: 'Total Tasks', value: total, sub: 'across all columns', icon: '⊟', color: '#6366f1' },
    { label: 'Completed', value: done, sub: `${completionRate}% completion rate`, icon: '✓', color: '#10b981' },
    { label: 'In Progress', value: inProgress, sub: 'actively being worked', icon: '◎', color: '#f59e0b' },
    { label: 'Unassigned', value: unassigned, sub: 'need an owner', icon: '◷', color: '#ef4444' },
  ];

  return (
    <div className="analytics-root">
      <div className="analytics-stats">
        {statCards.map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ color: s.color, background: s.color + '18' }}>{s.icon}</div>
            <div>
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-sub">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="analytics-charts">
        <div className="chart-card">
          <div className="chart-title">Task Distribution</div>
          <div className="donut-wrap">
            <DonutChart segments={donutSegments} size={110} />
            <div className="donut-legend">
              {donutSegments.map(s => (
                <div key={s.label} className="legend-item">
                  <span className="legend-dot" style={{ background: s.color }} />
                  <span className="legend-label">{s.label}</span>
                  <span className="legend-val">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="chart-card chart-card-wide">
          <div className="chart-title">Task Creation <span className="chart-sub">Last 7 days</span></div>
          {total === 0 ? <div className="chart-empty">No tasks yet</div> : <BarChart data={last7} color="#6366f1" height={90} />}
        </div>
        <div className="chart-card chart-card-wide">
          <div className="chart-title">Completion Velocity <span className="chart-sub">Tasks done per day</span></div>
          {done === 0 ? <div className="chart-empty">No completed tasks yet</div> : <BarChart data={velocity7} color="#10b981" height={90} />}
        </div>
      </div>

      <div className="chart-card progress-card">
        <div className="progress-header">
          <span className="chart-title">Overall Progress</span>
          <span className="progress-pct" style={{ color: completionRate === 100 ? '#10b981' : '#6366f1' }}>{completionRate}%</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${completionRate}%`, background: completionRate === 100 ? '#10b981' : '#6366f1' }} />
          {inProgress > 0 && <div className="progress-fill progress-fill-wip" style={{ width: `${Math.round((inProgress / total) * 100)}%`, left: `${completionRate}%` }} />}
        </div>
        <div className="progress-legend">
          <span style={{color:'#10b981'}}>■ Done ({done})</span>
          <span style={{color:'#f59e0b'}}>■ In Progress ({inProgress})</span>
          <span style={{color:'#94a3b8'}}>■ To Do ({todo})</span>
        </div>
      </div>

      {topAssignees.length > 0 && (
        <div className="chart-card">
          <div className="chart-title">Top Contributors</div>
          <div className="assignee-table">
            {topAssignees.map(([id, count], i) => (
              <div key={id} className="assignee-row">
                <span className="assignee-rank">#{i + 1}</span>
                <span className="assignee-avatar-sm">{id.charAt(0).toUpperCase()}</span>
                <span className="assignee-id-text">{id}…</span>
                <div className="assignee-bar-wrap"><div className="assignee-bar-fill" style={{ width: `${Math.round((count / total) * 100)}%` }} /></div>
                <span className="assignee-count">{count} tasks</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {total === 0 && (
        <div className="empty-state" style={{marginTop: '2rem'}}>
          <div className="empty-icon">◈</div>
          <h3>No data yet</h3>
          <p>Create some tasks to see analytics</p>
        </div>
      )}
    </div>
  );
}