import React, { useEffect, useState } from "react";
import api from "../utils/api";

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [resetModal, setResetModal] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [s, u] = await Promise.all([api.get("/admin/stats"), api.get("/admin/users")]);
      setStats(s.data); setUsers(u.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const toggleUser = async (uid) => {
    await api.post(`/admin/users/${uid}/toggle`);
    setMsg("User status updated"); fetchData();
    setTimeout(() => setMsg(""), 3000);
  };

  const deleteUser = async (uid, username) => {
    if (!window.confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    await api.delete(`/admin/users/${uid}`);
    setMsg("User deleted"); fetchData();
    setTimeout(() => setMsg(""), 3000);
  };

  const resetPassword = async () => {
    if (!newPassword || newPassword.length < 6) { setMsg("Password too short"); return; }
    await api.post(`/admin/users/${resetModal.id}/reset-password`, { password: newPassword });
    setMsg(`Password reset for ${resetModal.username}`);
    setResetModal(null); setNewPassword("");
    setTimeout(() => setMsg(""), 3000);
  };

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    (u.email||"").toLowerCase().includes(search.toLowerCase()) ||
    (u.full_name||"").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="loading">Loading admin panel...</div>;

  return (
    <div className="admin-page">
      <h1 className="page-title">⚙️ Admin Panel</h1>
      {msg && <div className="admin-msg">{msg}</div>}

      {/* Stats */}
      <div className="stats-grid" style={{marginBottom:32}}>
        <div className="stat-card accent">
          <div className="stat-label">Total Users</div>
          <div className="stat-value">{stats?.total_users}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Users</div>
          <div className="stat-value green">{stats?.active_users}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Transactions</div>
          <div className="stat-value">{stats?.total_transactions?.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Loans</div>
          <div className="stat-value">{stats?.active_loans}</div>
        </div>
      </div>

      {/* User Management */}
      <div className="admin-section">
        <div className="admin-section-header">
          <h2>User Management</h2>
          <input className="filter-input" placeholder="🔍 Search users..."
            value={search} onChange={e => setSearch(e.target.value)} style={{width:260}} />
        </div>
        <div className="txn-table-wrap">
          <table className="txn-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Account</th>
                <th>Balance</th>
                <th>Txns</th>
                <th>Loans</th>
                <th>Joined</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.filter(u => !u.is_admin).map(u => (
                <tr key={u.id}>
                  <td>
                    <div className="u-cell">
                      <div className="u-mini-avatar">{(u.full_name||u.username)[0].toUpperCase()}</div>
                      <div>
                        <div style={{fontWeight:600}}>{u.full_name || u.username}</div>
                        <div style={{fontSize:12,color:"var(--text3)"}}>@{u.username}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{fontSize:13}}>{u.email}</td>
                  <td style={{fontSize:12,color:"var(--text3)"}}>{u.account_number}</td>
                  <td>₹{(u.balance||0).toLocaleString("en-IN",{maximumFractionDigits:0})}</td>
                  <td>{u.txn_count}</td>
                  <td>{u.loan_count}</td>
                  <td style={{fontSize:12,color:"var(--text3)"}}>{u.created_at?.slice(0,10)}</td>
                  <td>
                    <span className={`status-badge ${u.is_active ? "active" : "blocked"}`}>
                      {u.is_active ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td>
                    <div className="action-btns">
                      <button className="act-btn toggle" onClick={() => toggleUser(u.id)}>
                        {u.is_active ? "Disable" : "Enable"}
                      </button>
                      <button className="act-btn reset" onClick={() => { setResetModal(u); setNewPassword(""); }}>
                        Reset PW
                      </button>
                      <button className="act-btn del" onClick={() => deleteUser(u.id, u.username)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reset Password Modal */}
      {resetModal && (
        <div className="modal-overlay" onClick={() => setResetModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Reset Password — @{resetModal.username}</h3>
            <div className="field" style={{marginTop:20}}>
              <label>New Password</label>
              <input type="password" value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Min. 6 characters" autoFocus />
            </div>
            <div className="modal-btns">
              <button className="auth-btn" onClick={resetPassword}>Reset Password</button>
              <button className="btn-clear" onClick={() => setResetModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
