import { useState, useEffect, useRef, useCallback } from 'react';
import { projectApi } from "../../api/projectApi";

export default function CommandPalette({ projects = [], onSelectProject, onNavigate }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(0);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const searchTimer = useRef(null);

  // ── Keyboard shortcut ──
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelected(0);
      buildDefaultResults();
    }
  }, [open, projects]);

  const buildDefaultResults = () => {
    const items = [
      { type: 'action', id: 'new-project', label: 'Create new project', icon: '◈', shortcut: null },
      ...projects.slice(0, 5).map(p => ({
        type: 'project',
        id: p.id,
        label: p.name,
        sub: p.description || 'Open project',
        icon: p.name.charAt(0).toUpperCase(),
        project: p,
      })),
    ];
    setResults(items);
  };

  // ── Search tasks across all projects ──
  const doSearch = useCallback(async (q) => {
    if (!q.trim()) { buildDefaultResults(); return; }
    setSearching(true);

    const items = [];

    // Project name match
    projects.forEach(p => {
      if (p.name.toLowerCase().includes(q.toLowerCase())) {
        items.push({
          type: 'project',
          id: p.id,
          label: p.name,
          sub: p.description || 'Open project',
          icon: p.name.charAt(0).toUpperCase(),
          project: p,
        });
      }
    });

    // Task search across all projects
    const taskSearches = projects.map(async (p) => {
      try {
        const data = await projectApi.getTasks(p.id, { size: 50 });
        const tasks = data?.content || [];
        return tasks
          .filter(t =>
            t.title?.toLowerCase().includes(q.toLowerCase()) ||
            t.description?.toLowerCase().includes(q.toLowerCase())
          )
          .slice(0, 3)
          .map(t => ({
            type: 'task',
            id: t.id,
            label: t.title,
            sub: `${p.name} · ${statusLabel(t.status)}`,
            icon: statusIcon(t.status),
            iconColor: statusColor(t.status),
            project: p,
            task: t,
          }));
      } catch {
        return [];
      }
    });

    const taskResults = (await Promise.all(taskSearches)).flat();
    setResults([...items, ...taskResults]);
    setSearching(false);
    setSelected(0);
  }, [projects]);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => doSearch(query), 220);
    return () => clearTimeout(searchTimer.current);
  }, [query, doSearch]);

  // ── Keyboard navigation ──
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelected(s => Math.min(s + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelected(s => Math.max(s - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (results[selected]) handleSelect(results[selected]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, selected, results]);

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.children[selected];
    el?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  const handleSelect = (item) => {
    if (item.type === 'project') {
      onSelectProject?.(item.project);
    } else if (item.type === 'task') {
      onSelectProject?.(item.project);
    } else if (item.type === 'action') {
      onNavigate?.(item.id);
    }
    setOpen(false);
  };

  const highlight = (text, q) => {
    if (!q.trim()) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark>{text.slice(idx, idx + q.length)}</mark>
        {text.slice(idx + q.length)}
      </>
    );
  };

  if (!open) return (
    <button className="cmd-trigger" onClick={() => setOpen(true)} title="Command palette (⌘K)">
      <span className="cmd-trigger-icon">⌘</span>
      <span className="cmd-trigger-label">Search...</span>
      <span className="cmd-trigger-shortcut">⌘K</span>
    </button>
  );

  return (
    <div className="cmd-overlay" onClick={() => setOpen(false)}>
      <div className="cmd-palette" onClick={e => e.stopPropagation()}>

        <div className="cmd-input-wrap">
          <span className="cmd-search-icon">{searching ? <span className="spinner spinner-dark" /> : '⌕'}</span>
          <input
            ref={inputRef}
            className="cmd-input"
            placeholder="Search projects, tasks, actions..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <button className="cmd-clear" onClick={() => { setQuery(''); inputRef.current?.focus(); }}>✕</button>
          )}
        </div>

        {results.length > 0 && (
          <>
            <div className="cmd-section-label">
              {query ? `${results.length} result${results.length !== 1 ? 's' : ''}` : 'Quick access'}
            </div>
            <div className="cmd-list" ref={listRef}>
              {results.map((item, i) => (
                <div
                  key={item.id + i}
                  className={`cmd-item ${i === selected ? 'cmd-item-selected' : ''} cmd-item-${item.type}`}
                  onMouseEnter={() => setSelected(i)}
                  onClick={() => handleSelect(item)}
                >
                  <span
                    className="cmd-item-icon"
                    style={item.iconColor ? { color: item.iconColor } : {}}
                  >
                    {item.icon}
                  </span>
                  <div className="cmd-item-text">
                    <span className="cmd-item-label">{highlight(item.label, query)}</span>
                    {item.sub && <span className="cmd-item-sub">{item.sub}</span>}
                  </div>
                  <span className={`cmd-item-type cmd-type-${item.type}`}>{item.type}</span>
                  {i === selected && <span className="cmd-item-enter">↵</span>}
                </div>
              ))}
            </div>
          </>
        )}

        {results.length === 0 && query && !searching && (
          <div className="cmd-empty">No results for "{query}"</div>
        )}

        <div className="cmd-footer">
          <span><kbd>↑↓</kbd> navigate</span>
          <span><kbd>↵</kbd> select</span>
          <span><kbd>Esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}

const statusLabel = s => ({ TODO: 'To Do', IN_PROGRESS: 'In Progress', DONE: 'Done' }[s] || s);
const statusIcon = s => ({ TODO: '○', IN_PROGRESS: '◎', DONE: '●' }[s] || '○');
const statusColor = s => ({ TODO: '#94a3b8', IN_PROGRESS: '#6366f1', DONE: '#10b981' }[s] || '#94a3b8');