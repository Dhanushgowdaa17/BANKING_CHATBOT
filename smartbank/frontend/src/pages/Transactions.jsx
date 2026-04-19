import React, { useEffect, useState, useCallback } from "react";
import api from "../utils/api";

const CATEGORIES = ["Shopping","Food","Utilities","Transport","Entertainment","Healthcare","Housing","Education","Salary","Transfer","Cashback","Refund","Interest","Bonus"];

export default function Transactions() {
  const [data, setData] = useState({ transactions: [], total: 0 });
  const [filters, setFilters] = useState({ search:"", type:"", category:"", date_from:"", date_to:"" });
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const LIMIT = 15;

  const fetchTxns = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: LIMIT, offset: page * LIMIT, ...filters };
      Object.keys(params).forEach(k => !params[k] && delete params[k]);
      const res = await api.get("/user/transactions", { params });
      setData(res.data);
    } finally { setLoading(false); }
  }, [filters, page]);

  useEffect(() => { fetchTxns(); }, [fetchTxns]);

  const exportCSV = async () => {
    const res = await api.get("/user/transactions", { params: { limit: 1000, offset: 0 } });
    const txns = res.data.transactions;
    const header = "Date,Type,Description,Category,Amount,Balance After\n";
    const rows = txns.map(t =>
      `${t.created_at},${t.type},${t.description},${t.category},${t.amount},${t.balance_after}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "transactions.csv"; a.click();
  };

  const setFilter = (k, v) => { setFilters(f => ({...f, [k]: v})); setPage(0); };

  return (
    <div className="txn-page">
      <div className="page-header">
        <h1 className="page-title">Transactions</h1>
        <button className="btn-export" onClick={exportCSV}>⬇ Export CSV</button>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <input className="filter-input" placeholder="🔍 Search transactions..." value={filters.search}
          onChange={e => setFilter("search", e.target.value)} />
        <select className="filter-select" value={filters.type} onChange={e => setFilter("type", e.target.value)}>
          <option value="">All Types</option>
          <option value="debit">Debit</option>
          <option value="credit">Credit</option>
        </select>
        <select className="filter-select" value={filters.category} onChange={e => setFilter("category", e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input type="date" className="filter-input date" value={filters.date_from}
          onChange={e => setFilter("date_from", e.target.value)} />
        <input type="date" className="filter-input date" value={filters.date_to}
          onChange={e => setFilter("date_to", e.target.value)} />
        <button className="btn-clear" onClick={() => { setFilters({ search:"",type:"",category:"",date_from:"",date_to:"" }); setPage(0); }}>
          ✕ Clear
        </button>
      </div>

      {/* Table */}
      <div className="txn-table-wrap">
        {loading ? (
          <div className="loading">Loading transactions...</div>
        ) : data.transactions.length === 0 ? (
          <div className="empty-msg" style={{padding:40}}>No transactions found</div>
        ) : (
          <table className="txn-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              {data.transactions.map(t => (
                <tr key={t.id}>
                  <td className="td-date">{t.created_at?.slice(0,10)}</td>
                  <td className="td-desc">{t.description}</td>
                  <td><span className="cat-badge">{t.category}</span></td>
                  <td>
                    <span className={`type-badge ${t.type}`}>
                      {t.type === "debit" ? "▼" : "▲"} {t.type.toUpperCase()}
                    </span>
                  </td>
                  <td className={`td-amount ${t.type}`}>
                    {t.type === "debit" ? "-" : "+"}₹{t.amount.toLocaleString("en-IN", {minimumFractionDigits:2})}
                  </td>
                  <td className="td-bal">₹{t.balance_after.toLocaleString("en-IN", {minimumFractionDigits:2})}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div className="pagination">
        <span className="page-info">
          Showing {page * LIMIT + 1}–{Math.min((page + 1) * LIMIT, data.total)} of {data.total}
        </span>
        <div className="page-btns">
          <button onClick={() => setPage(p => Math.max(0, p-1))} disabled={page === 0}>← Prev</button>
          <span className="page-num">Page {page + 1}</span>
          <button onClick={() => setPage(p => p+1)} disabled={(page+1)*LIMIT >= data.total}>Next →</button>
        </div>
      </div>
    </div>
  );
}
