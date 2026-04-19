import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

function Logo() {
  return (
    <div className="logo" style={{marginBottom: 32}}>
      <svg width="36" height="36" viewBox="0 0 32 32" fill="none">
        <defs>
          <linearGradient id="alg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3d7fff" />
            <stop offset="100%" stopColor="#ff3d9a" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="10" fill="url(#alg)" />
        <path d="M16 7L22 11L22 17Q22 22 16 25Q10 22 10 17L10 11Z" fill="white" opacity="0.9" />
        <path d="M13 16L15.5 18.5L20 13" stroke="#3d7fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
      <span className="logo-text">SmartBank</span>
    </div>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const u = await login(form.username, form.password);
      navigate(u.is_admin ? "/admin" : "/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-orbs">
        <div className="orb o1" /><div className="orb o2" /><div className="orb o3" />
      </div>
      <div className="auth-card">
        <Logo />
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-sub">Sign in to your account</p>
        {error && <div className="auth-err">{error}</div>}
        <form onSubmit={submit} className="auth-form">
          <div className="field">
            <label>Username</label>
            <input value={form.username} onChange={e => setForm({...form, username: e.target.value})} placeholder="Enter username" required autoFocus />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Enter password" required />
          </div>
          <button className="auth-btn" disabled={loading}>
            {loading ? <span className="spinner" /> : "Sign In"}
          </button>
        </form>
        <p className="auth-switch">No account? <Link to="/signup">Create one</Link></p>
        <p className="auth-hint">Admin: <b>admin</b> / <b>admin123</b></p>
      </div>
    </div>
  );
}
