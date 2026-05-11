import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import DashboardPage from './pages/DashboardPage';
import ProjectPage from './pages/ProjectPage';
import LoginPage from './pages/LoginPage';
import { projectApi } from './api/projectApi';
import './index.css';
import CommandPalette from './components/search/CommandPalette';

function AppShell() {
  const { user, logout } = useAuth();
  const [selectedProject, setSelectedProject] = useState(null);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    if (user) {
      projectApi.getProjects().then(setProjects).catch(() => {});
    }
  }, [user, selectedProject]);

  if (!user) return <LoginPage />;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-logo">◈</span>
          <span className="sidebar-name">CollabSphere</span>
        </div>

        <div className="sidebar-search">
          <CommandPalette
            projects={projects}
            onSelectProject={(p) => setSelectedProject(p)}
            onNavigate={(action) => {
              if (action === 'new-project') setSelectedProject(null);
            }}
          />
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${!selectedProject ? 'active' : ''}`}
            onClick={() => setSelectedProject(null)}
          >
            <span className="nav-icon">⊟</span>
            Projects
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-chip">
            <span className="user-avatar">{(user.email || user.userId || 'U').charAt(0).toUpperCase()}</span>
            <span className="user-email">{user.email || user.userId?.substring(0, 16) || 'User'}</span>
          </div>
          <button className="btn-logout" onClick={logout} title="Sign out">⏻</button>
        </div>
      </aside>

      <main className="main-content">
        {selectedProject ? (
          <ProjectPage
            project={selectedProject}
            onBack={() => setSelectedProject(null)}
          />
        ) : (
          <DashboardPage onSelectProject={setSelectedProject} />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}