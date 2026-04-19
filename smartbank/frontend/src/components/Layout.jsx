import React, { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

function Logo() {
  return (
    <div className="logo">
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <defs>
          <linearGradient id="lg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3d7fff" />
            <stop offset="100%" stopColor="#ff3d9a" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="10" fill="url(#lg)" />
        <path d="M16 7L22 11L22 17Q22 22 16 25Q10 22 10 17L10 11Z" fill="white" opacity="0.9" />
        <path d="M13 16L15.5 18.5L20 13" stroke="#3d7fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
      <span className="logo-text">SmartBank</span>
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const initials = (user?.full_name || user?.username || "U").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <div className="layout">
      {sidebarOpen && <div className="overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-top">
          <Logo />
        </div>
        <div className="sidebar-user">
          <div className="avatar-lg">{initials}</div>
          <div>
            <div className="u-name">{user?.full_name || user?.username}</div>
            <div className="u-acct">{user?.account_number}</div>
          </div>
        </div>
        <nav className="sidenav">
          <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`} onClick={() => setSidebarOpen(false)}>
            <span className="nav-icon">⬛</span> Dashboard
          </NavLink>
          <NavLink to="/transactions" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`} onClick={() => setSidebarOpen(false)}>
            <span className="nav-icon">📋</span> Transactions
          </NavLink>
          <NavLink to="/chat" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`} onClick={() => setSidebarOpen(false)}>
            <span className="nav-icon">💬</span> AI Assistant
          </NavLink>
          {user?.is_admin && (
            <NavLink to="/admin" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`} onClick={() => setSidebarOpen(false)}>
              <span className="nav-icon">⚙️</span> Admin Panel
            </NavLink>
          )}
        </nav>
        <div className="sidebar-footer">
          <button className="nav-item danger" onClick={handleLogout}>
            <span className="nav-icon">🚪</span> Sign Out
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
          <div className="topbar-right">
            <span className="topbar-greeting">Hello, {user?.full_name?.split(" ")[0] || user?.username} 👋</span>
          </div>
        </header>
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
