import React, { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import api from "../utils/api";

const COLORS = ["#3d7fff","#ff3d9a","#22c55e","#f0b429","#a855f7","#06b6d4","#f97316","#ef4444"];

export default function Dashboard() {
  const [balance, setBalance] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loans, setLoans] = useState([]);
  const [rewards, setRewards] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/user/balance"),
      api.get("/user/transactions/summary"),
      api.get("/user/loans"),
      api.get("/user/rewards"),
      api.get("/user/cards"),
    ]).then(([b, s, l, r, c]) => {
      setBalance(b.data[0]);
      setSummary(s.data);
      setLoans(l.data);
      setRewards(r.data);
      setCards(c.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading your dashboard...</div>;

  const monthly = (summary?.monthly || []).slice().reverse();
  const categories = summary?.by_category || [];

  return (
    <div className="dashboard">
      <h1 className="page-title">Dashboard</h1>

      {/* Stats Row */}
      <div className="stats-grid">
        <div className="stat-card accent">
          <div className="stat-label">Account Balance</div>
          <div className="stat-value">₹{(balance?.balance || 0).toLocaleString("en-IN", {minimumFractionDigits:2})}</div>
          <div className="stat-sub">{balance?.account_type?.toUpperCase()} • {balance?.currency}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Reward Points</div>
          <div className="stat-value gold">{rewards?.total_points?.toLocaleString() || 0}</div>
          <div className="stat-sub">₹{rewards?.total_cashback?.toLocaleString("en-IN") || 0} cashback value</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Loans</div>
          <div className="stat-value">{loans.filter(l=>l.status==="active").length}</div>
          <div className="stat-sub">Total outstanding: ₹{loans.reduce((a,l)=>a+l.outstanding,0).toLocaleString("en-IN",{maximumFractionDigits:0})}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Cards</div>
          <div className="stat-value">{cards.length}</div>
          <div className="stat-sub">{cards.filter(c=>c.status==="active").length} active • {cards.filter(c=>c.status==="blocked").length} blocked</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="charts-grid">
        <div className="chart-card">
          <h3 className="chart-title">Income vs Expense (Monthly)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthly} margin={{top:10,right:10,left:0,bottom:0}}>
              <XAxis dataKey="month" tick={{fill:"#8892b0",fontSize:12}} />
              <YAxis tick={{fill:"#8892b0",fontSize:11}} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={v=>`₹${v.toLocaleString("en-IN")}`} contentStyle={{background:"#1a2040",border:"1px solid #2a3260",borderRadius:8}} />
              <Bar dataKey="income" fill="#22c55e" radius={[4,4,0,0]} name="Income" />
              <Bar dataKey="expense" fill="#ef4444" radius={[4,4,0,0]} name="Expense" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Spending by Category</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={categories.slice(0,8)} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={80} label={({category,percent})=>`${category} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                {categories.slice(0,8).map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={v=>`₹${v.toLocaleString("en-IN")}`} contentStyle={{background:"#1a2040",border:"1px solid #2a3260",borderRadius:8}} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Loans & Cards Row */}
      <div className="bottom-grid">
        <div className="info-card">
          <h3 className="card-title">Active Loans</h3>
          {loans.filter(l=>l.status==="active").length === 0 ? (
            <p className="empty-msg">No active loans</p>
          ) : loans.filter(l=>l.status==="active").map(l => (
            <div className="loan-item" key={l.id}>
              <div className="loan-top">
                <span className="loan-type">{l.loan_type.toUpperCase()} LOAN</span>
                <span className="loan-rate">{l.interest_rate}% p.a.</span>
              </div>
              <div className="loan-bar-wrap">
                <div className="loan-bar" style={{width:`${(l.outstanding/l.principal*100).toFixed(0)}%`}} />
              </div>
              <div className="loan-details">
                <span>Outstanding: <b>₹{l.outstanding.toLocaleString("en-IN",{maximumFractionDigits:0})}</b></span>
                <span>EMI: <b>₹{l.emi.toLocaleString("en-IN",{maximumFractionDigits:0})}/mo</b></span>
              </div>
              <div className="loan-due">Next due: {l.next_due_date}</div>
            </div>
          ))}
        </div>

        <div className="info-card">
          <h3 className="card-title">My Cards</h3>
          {cards.map(c => (
            <div className={`card-item ${c.status}`} key={c.id}>
              <div className="card-top">
                <span className="card-type">{c.card_type.toUpperCase()}</span>
                <span className={`card-status ${c.status}`}>{c.status.toUpperCase()}</span>
              </div>
              <div className="card-number">{c.card_number_masked}</div>
              <div className="card-expiry">Expires {c.expiry}</div>
            </div>
          ))}
        </div>

        <div className="info-card">
          <h3 className="card-title">Recent Rewards</h3>
          {(rewards?.rewards || []).slice(0,5).map(r => (
            <div className="reward-item" key={r.id}>
              <div className="reward-source">{r.source}</div>
              <div className="reward-pts">+{r.points} pts <span className="reward-cash">(₹{r.cashback_value})</span></div>
              <div className="reward-date">{r.date}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
