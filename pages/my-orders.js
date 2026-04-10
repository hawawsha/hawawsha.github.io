// pages/my-orders.js
import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function MyOrders() {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [requesting, setRequesting] = useState(null);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  useEffect(() => {
    const init = () => {
      if (typeof window !== 'undefined' && window.Pi) {
        window.Pi.init({ version: "2.0", sandbox: false }, {
          onIncompletePaymentFound: async (p) => {
            try {
              await fetch('/api/payment', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ action: 'approve', paymentId: p.identifier }) });
              await fetch('/api/payment', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ action: 'complete', paymentId: p.identifier, txid: p.transaction?.txid }) });
            } catch(e) {}
          }
        });
      } else {
        setTimeout(init, 500);
      }
    };
    init();
  }, []);

  async function loginWithPi() {
    try {
      if (!window.Pi) { showToast('يرجى الفتح من متصفح Pi'); return; }
      const auth = await window.Pi.authenticate(['username', 'payments']);
      setUser(auth.user);
      loadOrders(auth.user.username);
    } catch(e) { showToast('فشل تسجيل الدخول'); }
  }

  async function loadOrders(username) {
    setLoading(true);
    try {
      const res = await fetch(`/api/my-orders?username=${username}`);
      const data = await res.json();
      setOrders(data.records || []);
    } catch(e) { showToast('خطأ في تحميل الطلبات'); }
    setLoading(false);
  }

  async function requestRefund(order) {
    setRequesting(order.id);
    try {
      const res = await fetch('/api/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request',
          productId: order.fields.product_id,
          productName: order.fields.product_name,
          buyerUsername: user.username,
          buyerUid: user.uid,
          amountPi: order.fields.amount_pi
        })
      });
      if (res.ok) showToast('✅ تم إرسال طلب الاسترجاع');
      else showToast('❌ فشل إرسال الطلب');
    } catch(e) { showToast('❌ خطأ في الإرسال'); }
    setRequesting(null);
  }

  return (
    <>
      <Head>
        <title>طلباتي - Souq Pi</title>
        <script src="https://sdk.minepi.com/pi-sdk.js"></script>
        <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#0a0118;color:#fff;font-family:'Cairo',sans-serif;direction:rtl;min-height:100vh;padding-bottom:40px;}
        .header{background:rgba(26,11,46,0.95);padding:14px 20px;border-bottom:1px solid #d4af37;display:flex;align-items:center;gap:10px;position:sticky;top:0;z-index:100;}
        .badge{background:linear-gradient(135deg,#6a0dad,#d4af37);border-radius:50%;width:38px;height:38px;display:flex;align-items:center;justify-content:center;font-size:1.1em;flex-shrink:0;}
        .back-btn{background:rgba(255,255,255,0.08);border:none;color:#fff;padding:8px 16px;border-radius:10px;cursor:pointer;font-family:'Cairo',sans-serif;font-size:0.85em;}
        .container{max-width:480px;margin:0 auto;padding:16px;}
        .login-box{text-align:center;padding:60px 20px;}
        .btn-login{background:linear-gradient(135deg,#6a0dad,#d4af37);color:white;border:none;padding:14px 30px;border-radius:14px;font-weight:900;cursor:pointer;font-size:1em;font-family:'Cairo',sans-serif;margin-top:20px;}
        .order-card{background:#1a0b2e;border:1px solid #331a5e;border-radius:16px;padding:16px;margin-bottom:12px;}
        .order-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;}
        .order-name{font-weight:800;font-size:0.95em;color:#fff;}
        .order-price{color:#d4af37;font-weight:900;font-size:0.9em;white-space:nowrap;}
        .order-date{font-size:0.7em;color:#b0b0b0;margin-top:4px;}
        .order-table{display:inline-block;background:rgba(106,13,173,0.3);border:1px solid #6a0dad;border-radius:8px;padding:2px 10px;font-size:0.72em;color:#c084fc;margin-top:6px;}
        .btn-refund{background:none;border:1px solid #ef4444;color:#ef4444;padding:8px;border-radius:10px;width:100%;font-size:0.8em;margin-top:10px;cursor:pointer;font-family:'Cairo',sans-serif;font-weight:700;}
        .btn-refund:disabled{opacity:0.5;cursor:not-allowed;}
        .empty{text-align:center;padding:60px 20px;color:#b0b0b0;}
        .empty-icon{font-size:3em;margin-bottom:12px;}
        .toast{position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:#6a0dad;padding:10px 20px;border-radius:20px;font-size:0.85em;z-index:2000;white-space:nowrap;}
        .count-badge{background:rgba(212,175,55,0.15);border:1px solid rgba(212,175,55,0.3);border-radius:12px;padding:8px 16px;margin-bottom:16px;text-align:center;font-size:0.85em;color:#d4af37;}
      `}</style>

      <div className="header">
        <button className="back-btn" onClick={() => window.history.back()}>← رجوع</button>
        <div className="badge">📦</div>
        <div>
          <div style={{fontWeight:900, fontSize:'0.9em'}}>طلباتي</div>
          <div style={{fontSize:'0.65em', color:'#d4af37'}}>Souq Pi V3</div>
        </div>
      </div>

      <div className="container">

        {!user && (
          <div className="login-box">
            <div style={{fontSize:'3em'}}>📦</div>
            <div style={{fontWeight:800, fontSize:'1.1em', margin:'12px 0 8px'}}>سجّل الدخول</div>
            <div style={{fontSize:'0.85em', color:'#b0b0b0'}}>لمشاهدة مشترياتك وطلب الاسترجاع</div>
            <button className="btn-login" onClick={loginWithPi}>🔑 دخول بـ Pi</button>
          </div>
        )}

        {user && loading && (
          <div style={{textAlign:'center', padding:40, color:'#b0b0b0'}}>جاري تحميل طلباتك...</div>
        )}

        {user && !loading && (
          <>
            {orders.length > 0 && (
              <div className="count-badge">🛍️ لديك {orders.length} طلب</div>
            )}

            {orders.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">🛒</div>
                <div style={{fontWeight:800, marginBottom:8}}>لا توجد طلبات بعد</div>
                <div style={{fontSize:'0.82em'}}>ابدأ التسوق من الصفحة الرئيسية</div>
                <button
                  onClick={() => window.location.href = '/'}
                  style={{background:'linear-gradient(135deg,#6a0dad,#d4af37)',border:'none',color:'white',padding:'10px 24px',borderRadius:'12px',fontWeight:700,cursor:'pointer',fontFamily:'Cairo',marginTop:16}}
                >
                  تسوق الآن 🛍️
                </button>
              </div>
            ) : (
              orders.map(order => (
                <div key={order.id} className="order-card">
                  <div className="order-header">
                    <div>
                      <div className="order-name">{order.fields.product_name || 'منتج'}</div>
                      <div className="order-date">📅 {order.fields.purchased_at || 'غير محدد'}</div>
                      <div className="order-table">{order.fields.table_name || ''}</div>
                    </div>
                    <div className="order-price">π {order.fields.amount_pi}</div>
                  </div>
                  <button
                    className="btn-refund"
                    onClick={() => requestRefund(order)}
                    disabled={requesting === order.id}
                  >
                    {requesting === order.id ? 'جاري الإرسال...' : '↩️ طلب استرجاع'}
                  </button>
                </div>
              ))
            )}
          </>
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
