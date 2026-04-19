import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

function Logo() {
  return (
    <div className="logo" style={{marginBottom: 32}}>
      <svg width="36" height="36" viewBox="0 0 32 32" fill="none">
        <defs><linearGradient id="slg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#3d7fff" /><stop offset="100%" stopColor="#ff3d9a" /></linearGradient></defs>
        <rect width="32" height="32" rx="10" fill="url(#slg)" />
        <path d="M16 7L22 11L22 17Q22 22 16 25Q10 22 10 17L10 11Z" fill="white" opacity="0.9" />
        <path d="M13 16L15.5 18.5L20 13" stroke="#3d7fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
      <span className="logo-text">SmartBank</span>
    </div>
  );
}

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username:"", email:"", password:"", full_name:"", phone:"" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await signup(form);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Signup failed");
    } finally { setLoading(false); }
  };

  const f = (k) => ({ value: form[k], onChange: e => setForm({...form, [k]: e.target.value}) });

  return (
    <div className="auth-page">
      <div className="auth-orbs">
        <div className="orb o1" /><div className="orb o2" /><div className="orb o3" />
      </div>
      <div className="auth-card">
        <Logo />
        <h1 className="auth-title">Create account</h1>
        <p className="auth-sub">Join SmartBank today</p>
        {error && <div className="auth-err">{error}</div>}
        <form onSubmit={submit} className="auth-form">
          <div className="field"><label>Full Name</label><input {...f("full_name")} placeholder="Your full name" /></div>
          <div className="field"><label>Username</label><input {...f("username")} placeholder="Choose a username" required /></div>
          <div className="field"><label>Email</label><input type="email" {...f("email")} placeholder="you@email.com" required /></div>
          <div className="field"><label>Phone</label><input {...f("phone")} placeholder="Mobile number" /></div>
          <div className="field"><label>Password</label><input type="password" {...f("password")} placeholder="Min. 6 characters" required /></div>
          <button className="auth-btn" disabled={loading}>
            {loading ? <span className="spinner" /> : "Create Account"}
          </button>
        </form>
        <p className="auth-switch">Have an account? <Link to="/login">Sign in</Link></p>
      </div>
    </div>
  );
}
