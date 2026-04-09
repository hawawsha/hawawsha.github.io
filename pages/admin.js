// pages/admin.js
import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [acting, setActing] = useState(null);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function login() {
    if (!keyInput.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin-sellers', {
        headers: { 'x-admin-key': keyInput.trim() }
      });
      if (res.status === 401) {
        showToast('❌ مفتاح خاطئ');
        setLoading(false);
        return;
      }
      const data = await res.json();
      setRequests(data.records || []);
      setAuthed(true);
    } catch (e) {
      showToast('خطأ في الاتصال');
    }
    setLoading(false);
  }

  async function loadRequests() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin-sellers', {
        headers: { 'x-admin-key': keyInput.trim() }
      });
      const data = await res.json();
      setRequests(data.records || []);
    } catch (e) {
      showToast('خطأ في التحميل');
    }
    setLoading(false);
  }

  async function handleAction(record, action) {
    setActing(record.id);
    try {
      const res = await fetch('/api/admin-sellers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': keyInput.trim()
        },
        body: JSON.stringify({
          recordId: record.id,
          action,
          username: record.fields.username,
          shop_name: record.fields.shop_name
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(action === 'approve' ? '✅ تمت الموافقة!' : '❌ تم الرفض');
        await loadRequests();
      }
    } catch (e) {
      showToast('خطأ في العملية');
    }
    setActing(null);
  }

  const pending = requests.filter(r => r.fields.status === 'pending');
  const approved = requests.filter(r => r.fields.status === 'approved');
  const rejected = requests.filter(r => r.fields.status === 'rejected');

  return (
    <>
      <Head>
        <title>لوحة الأدمن - Souq Pi</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#0a0118;color:#fff;font-family:'Cairo',sans-serif;direction:rtl;min-height:100vh;}
        .header{background:rgba(26,11,46,0.95);padding:16px 20px;border-bottom:1px solid #d4af37;display:flex;align-items:center;gap:12px;position:sticky;top:0;z-index:100;}
        .badge{background:linear-gradient(135deg,#6a0dad,#d4af37);border-radius:50%;width:38px;height:38px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:1.1em;flex-shrink:0;}
        .login-box{max-width:400px;margin:80px auto;padding:30px 20px;background:rgba(255,255,255,0.04);border:1px solid #6a0dad;border-radius:20px;text-align:center;}
        .input{width:100%;background:#0a0118;border:1px solid #6a0dad;padding:14px;border-radius:12px;color:#fff;font-size:1em;margin:16px 0;font-family:'Cairo',sans-serif;text-align:center;}
        .btn-primary{background:linear-gradient(135deg,#6a0dad,#d4af37);color:white;border:none;padding:12px 30px;border-radius:12px;font-weight:700;cursor:pointer;font-size:1em;width:100%;font-family:'Cairo',sans-serif;}
        .stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;padding:16px;}
        .stat{background:rgba(255,255,255,0.04);border-radius:14px;padding:14px 8px;text-align:center;border:1px solid rgba(255,255,255,0.08);}
        .stat-num{font-size:1.8em;font-weight:900;}
        .stat-label{font-size:0.7em;color:#b0b0b0;margin-top:2px;}
        .section-title{padding:8px 16px;font-size:0.85em;font-weight:700;color:#d4af37;text-transform:uppercase;letter-spacing:1px;}
        .card{background:#1a0b2e;border:1px solid #331a5e;border-radius:16px;padding:16px;margin:8px 16px;}
        .card-header{display:flex;align-items:center;gap:10px;margin-bottom:10px;}
        .avatar{width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#6a0dad,#d4af37);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:1.1em;flex-shrink:0;}
        .username{font-weight:800;font-size:0.95em;}
        .shop{font-size:0.75em;color:#b0b0b0;margin-top:2px;}
        .date{font-size:0.7em;color:#6a0dad;margin-top:2px;}
        .actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px;}
        .btn-approve{background:linear-gradient(135deg,#16a34a,#22c55e);color:white;border:none;padding:10px;border-radius:10px;font-weight:700;cursor:pointer;font-size:0.85em;font-family:'Cairo',sans-serif;}
        .btn-reject{background:linear-gradient(135deg,#dc2626,#ef4444);color:white;border:none;padding:10px;border-radius:10px;font-weight:700;cursor:pointer;font-size:0.85em;font-family:'Cairo',sans-serif;}
        .status-badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:0.72em;font-weight:700;margin-top:6px;}
        .status-approved{background:rgba(34,197,94,0.15);color:#22c55e;border:1px solid #22c55e;}
        .status-rejected{background:rgba(239,68,68,0.15);color:#ef4444;border:1px solid #ef4444;}
        .status-pending{background:rgba(234,179,8,0.15);color:#eab308;border:1px solid #eab308;}
        .empty{text-align:center;padding:30px;color:#b0b0b0;font-size:0.85em;}
        .toast{position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:#6a0dad;padding:10px 20px;border-radius:20px;font-size:0.85em;z-index:2000;white-space:nowrap;}
        .refresh-btn{background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.1);color:#d4af37;padding:8px 14px;border-radius:10px;cursor:pointer;font-size:0.8em;font-family:'Cairo',sans-serif;margin-right:auto;}
      `}</style>

      {/* Header */}
      <div className="header">
        <div className="badge">🔐</div>
        <div>
          <div style={{fontWeight:900, fontSize:'0.9em'}}>لوحة الأدمن</div>
          <div style={{fontSize:'0.65em', color:'#d4af37'}}>Souq Pi V3</div>
        </div>
        {authed && (
          <button className="refresh-btn" onClick={loadRequests}>
            🔄 تحديث
          </button>
        )}
      </div>

      {/* Login */}
      {!authed ? (
        <div className="login-box">
          <div style={{fontSize:'2.5em', marginBottom:10}}>🔑</div>
          <div style={{fontWeight:800, fontSize:'1.1em', marginBottom:6}}>دخول الأدمن</div>
          <div style={{fontSize:'0.8em', color:'#b0b0b0', marginBottom:10}}>أدخل مفتاح الأدمن السري</div>
          <input
            className="input"
            type="password"
            placeholder="ADMIN_SECRET_KEY"
            value={keyInput}
            onChange={e => setKeyInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
          />
          <button className="btn-primary" onClick={login} disabled={loading}>
            {loading ? 'جاري التحقق...' : 'دخول 🔓'}
          </button>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="stats">
            <div className="stat">
              <div className="stat-num" style={{color:'#eab308'}}>{pending.length}</div>
              <div className="stat-label">قيد الانتظار</div>
            </div>
            <div className="stat">
              <div className="stat-num" style={{color:'#22c55e'}}>{approved.length}</div>
              <div className="stat-label">مقبول</div>
            </div>
            <div className="stat">
              <div className="stat-num" style={{color:'#ef4444'}}>{rejected.length}</div>
              <div className="stat-label">مرفوض</div>
            </div>
          </div>

          {/* Pending */}
          <div className="section-title">⏳ قيد الانتظار ({pending.length})</div>
          {pending.length === 0 && <div className="empty">لا توجد طلبات جديدة</div>}
          {pending.map(r => (
            <div key={r.id} className="card">
              <div className="card-header">
                <div className="avatar">{r.fields.username?.[0]?.toUpperCase() || '؟'}</div>
                <div>
                  <div className="username">@{r.fields.username}</div>
                  <div className="shop">🏪 {r.fields.shop_name}</div>
                  <div className="date">📅 {r.fields.created_at || 'غير محدد'}</div>
                </div>
              </div>
              <div className="actions">
                <button
                  className="btn-approve"
                  onClick={() => handleAction(r, 'approve')}
                  disabled={acting === r.id}
                >
                  {acting === r.id ? '...' : '✅ قبول'}
                </button>
                <button
                  className="btn-reject"
                  onClick={() => handleAction(r, 'reject')}
                  disabled={acting === r.id}
                >
                  {acting === r.id ? '...' : '❌ رفض'}
                </button>
              </div>
            </div>
          ))}

          {/* Approved */}
          <div className="section-title" style={{marginTop:16}}>✅ المقبولون ({approved.length})</div>
          {approved.length === 0 && <div className="empty">لا يوجد تجار مقبولون بعد</div>}
          {approved.map(r => (
            <div key={r.id} className="card">
              <div className="card-header">
                <div className="avatar">{r.fields.username?.[0]?.toUpperCase() || '؟'}</div>
                <div>
                  <div className="username">@{r.fields.username}</div>
                  <div className="shop">🏪 {r.fields.shop_name}</div>
                  <span className="status-badge status-approved">✅ مقبول</span>
                </div>
              </div>
            </div>
          ))}

          {/* Rejected */}
          <div className="section-title" style={{marginTop:16}}>❌ المرفوضون ({rejected.length})</div>
          {rejected.length === 0 && <div className="empty">لا يوجد طلبات مرفوضة</div>}
          {rejected.map(r => (
            <div key={r.id} className="card">
              <div className="card-header">
                <div className="avatar" style={{background:'linear-gradient(135deg,#dc2626,#ef4444)'}}>
                  {r.fields.username?.[0]?.toUpperCase() || '؟'}
                </div>
                <div>
                  <div className="username">@{r.fields.username}</div>
                  <div className="shop">🏪 {r.fields.shop_name}</div>
                  <span className="status-badge status-rejected">❌ مرفوض</span>
                </div>
              </div>
            </div>
          ))}

          <div style={{height: 40}} />
        </>
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
