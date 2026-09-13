import React from 'react';
import { Routes, Route, NavLink, useParams } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import AnalysisPage from './pages/AnalysisPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ExplorerPage from './pages/ExplorerPage.jsx';
import ArchitecturePage from './pages/ArchitecturePage.jsx';

function Sidebar() {
  const { id } = useParams();
  const hasRepo = Boolean(id);
  return (
    <aside className="sidebar">
      <div className="wordmark">
        <div className="mark">Repo<span>Intel</span></div>
        <div className="sub">// ai repository analyzer</div>
      </div>
      <ul className="nav-list">
        <li><NavLink to="/" end>New Analysis</NavLink></li>
        {hasRepo && (
          <>
            <li><NavLink to={`/analysis/${id}`}>Analysis Status</NavLink></li>
            <li><NavLink to={`/dashboard/${id}`}>Dashboard</NavLink></li>
            <li><NavLink to={`/explorer/${id}`}>File Explorer</NavLink></li>
            <li><NavLink to={`/architecture/${id}`}>Architecture</NavLink></li>
          </>
        )}
      </ul>
      <div className="sidebar-footer">
        MOCK_MODE ready out of the box.<br />
        Set MOCK_MODE=false + Ollama + MongoDB for real analysis.
      </div>
    </aside>
  );
}

export default function App() {
  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<><Sidebar /><div className="content-area"><HomePage /></div></>} />
        <Route path="/analysis/:id" element={<><Sidebar /><div className="content-area"><AnalysisPage /></div></>} />
        <Route path="/dashboard/:id" element={<><Sidebar /><div className="content-area"><DashboardPage /></div></>} />
        <Route path="/explorer/:id" element={<><Sidebar /><div className="content-area"><ExplorerPage /></div></>} />
        <Route path="/architecture/:id" element={<><Sidebar /><div className="content-area"><ArchitecturePage /></div></>} />
      </Routes>
    </div>
  );
}
