import { useState, useRef, useEffect } from 'react';
import { projectApi } from '../../api/index.js';   // ← fixed: was importing from wrong file
import { aiService } from '../../api'
export default function AIAssistant({ project, onTasksCreated }) {

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingTasks, setPendingTasks] = useState(null);
  const [creating, setCreating] = useState(false);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      if (messages.length === 0) {
        setMessages([{
          role: 'assistant', type: 'message',
          content: `Hi! I'm your AI project assistant for **${project.name}**.\n\nTry asking me:\n• "Break this project into 8 development tasks"\n• "What tasks should a login feature have?"\n• "Generate a sprint plan for user authentication"\n• "What are the risks for this project?"`,
        }]);
      }
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingTasks]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userInput = input.trim();
    setMessages(prev => [...prev, { role: 'user', type: 'user', content: userInput }]);
    setInput('');
    setLoading(true);
    setPendingTasks(null);

    try {
      // ── Uses projectApi axios instance which auto-attaches Bearer token ──
    const res = await aiService.chat(userInput)
    const raw = res.data?.content;
      let parsed;
      try {
        const clean = raw.replace(/```json|```/g, '').trim();
        parsed = JSON.parse(clean);
      } catch {
        parsed = { type: 'message', content: raw };
      }

      if (parsed.type === 'tasks' && parsed.tasks?.length > 0) {
        setMessages(prev => [...prev, {
          role: 'assistant', type: 'tasks',
          content: parsed.summary || `I've generated ${parsed.tasks.length} tasks for you.`,
          tasks: parsed.tasks,
        }]);
        setPendingTasks(parsed.tasks);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant', type: 'message',
          content: parsed.content || raw,
        }]);
      }

    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'assistant', type: 'error',
        content: `Error: ${e.response?.data?.error || e.message}`,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const createAllTasks = async () => {
    if (!pendingTasks?.length) return;
    setCreating(true);
    let created = 0;
    for (const task of pendingTasks) {
      try {
        await projectApi.post(`/api/projects/${project.id}/tasks`, {
          title: task.title,
          description: task.description,
        });
        created++;
      } catch {}
    }
    setCreating(false);
    setPendingTasks(null);
    setMessages(prev => [...prev, {
      role: 'assistant', type: 'success',
      content: `✓ Created ${created} tasks on your board!`,
    }]);
    onTasksCreated?.();
  };

  const dismissTasks = () => {
    setPendingTasks(null);
    setMessages(prev => [...prev, {
      role: 'assistant', type: 'message',
      content: 'No problem! Let me know if you want to try a different breakdown.',
    }]);
  };

  const formatContent = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/^• /gm, '&bull; ')
      .split('\n')
      .map((line, i) => `<span key=${i}>${line}</span>`)
      .join('<br/>');
  };

  return (
    <>
      <button
        className={`ai-fab ${open ? 'ai-fab-open' : ''}`}
        onClick={() => setOpen(o => !o)}
        title="AI Assistant"
      >
        <span className="ai-fab-icon">{open ? '✕' : '✦'}</span>
        {!open && <span className="ai-fab-label">AI Assistant</span>}
      </button>

      {open && (
        <div className="ai-panel">
          <div className="ai-panel-header">
            <div className="ai-panel-title">
              <span className="ai-star">✦</span>
              <span>AI Assistant</span>
              <span className="ai-model-tag">AI</span>
            </div>
            <button className="ai-icon-btn" onClick={() => setOpen(false)}>✕</button>
          </div>

          <div className="ai-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`ai-msg ai-msg-${msg.role}`}>
                {msg.role === 'assistant' && <span className="ai-avatar">✦</span>}
                <div className={`ai-bubble ai-bubble-${msg.type}`}>
                  {msg.type === 'tasks' ? (
                    <>
                      <p className="ai-bubble-summary">{msg.content}</p>
                      <div className="ai-task-preview">
                        {msg.tasks.map((t, ti) => (
                          <div key={ti} className="ai-task-item">
                            <span className="ai-task-num">{ti + 1}</span>
                            <div>
                              <p className="ai-task-title">{t.title}</p>
                              {t.description && <p className="ai-task-desc">{t.description}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                      {pendingTasks && (
                        <div className="ai-task-btns">
                          <button className="btn-primary btn-sm" onClick={createAllTasks} disabled={creating}>
                            {creating ? 'Creating...' : `✓ Add All ${pendingTasks.length} Tasks`}
                          </button>
                          <button className="btn-ghost btn-sm" onClick={dismissTasks}>Dismiss</button>
                        </div>
                      )}
                    </>
                  ) : (
                    <p dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }} />
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="ai-input-row">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Ask me to generate tasks, plan a sprint..."
              disabled={loading}
            />
            <button className="ai-send-btn" onClick={sendMessage} disabled={loading || !input.trim()}>↑</button>
          </div>
        </div>
      )}
    </>
  );
}