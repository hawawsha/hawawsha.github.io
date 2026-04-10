// pages/become-seller.js
import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function BecomeSeller() {
  const [user, setUser] = useState(null);
  const [shopName, setShopName] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');

  // تهيئة Pi SDK
  useEffect(() => {
    const initPi = () => {
      if (typeof window !== 'undefined' && window.Pi) {
        window.Pi.init({ version: "2.0", sandbox: false }, {
          onIncompletePaymentFound: async (payment) => {
            try {
              await fetch('/api/payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'approve', paymentId: payment.identifier }) });
              await fetch('/api/payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'complete', paymentId: payment.identifier, txid: payment.transaction?.txid || payment.identifier }) });
            } catch(e) {}
          }
        });
      } else {
        setTimeout(initPi, 500);
      }
    };
    initPi();
  }, []);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function loginWithPi() {
    try {
      if (!window.Pi) { showToast('يرجى الفتح من متصفح Pi'); return; }
      const auth = await window.Pi.authenticate(['username', 'payments']);
      setUser(auth.user);
      checkStatus(auth.user.username);
    } catch (e) {
      showToast('فشل تسجيل الدخول');
    }
  }

  async function checkStatus(username) {
    setLoading(true);
    try {
      const res = await fetch(`/api/seller-request?username=${username}`);
      const data = await res.json();
      if (data.isSeller) {
        setStatus('approved');
      } else if (data.requestStatus) {
        setStatus(data.requestStatus);
      } else {
        setStatus('not_found');
      }
    } catch (e) {
      setStatus('not_found');
    }
    setLoading(false);
  }

  async function submitRequest() {
    if (!shopName.trim()) { showToast('أدخل اسم المتجر'); return; }
    if (!user) { showToast('سجّل الدخول أولاً'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/seller-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username, shop_name: shopName.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setStatus('pending');
        showToast('✅ تم إرسال طلبك بنجاح!');
      } else if (data.error === 'طلب موجود مسبقاً') {
        setStatus(data.status);
        showToast('طلبك موجود مسبقاً');
      } else {
        showToast(data.error || 'حدث خطأ');
      }
    } catch (e) {
      showToast('خطأ في الإرسال');
    }
    setSubmitting(false);
  }

  return (
    <>
      <Head>
        <title>انضم كتاجر - Souq Pi</title>
        <script src="https://sdk.minepi.com/pi-sdk.js"></script>
        <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#0a0118;color:#fff;font-family:'Cairo',sans-serif;direction:rtl;min-height:100vh;}
        .header{background:rgba(26,11,46,0.95);padding:14px 20px;border-bottom:1px solid #d4af37;display:flex;align-items:center;gap:10px;position:sticky;top:0;z-index:100;}
        .badge{background:linear-gradient(135deg,#6a0dad,#d4af37);border-radius:50%;width:38px;height:38px;display:flex;align-items:center;justify-content:center;font-size:1.1em;flex-shrink:0;}
        .container{max-width:480px;margin:0 auto;padding:24px 16px;}
        .hero{text-align:center;margin-bottom:28px;}
        .hero-icon{font-size:4em;margin-bottom:12px;}
        .hero-title{font-size:1.6em;font-weight:900;margin-bottom:8px;}
        .hero-sub{font-size:0.85em;color:#b0b0b0;line-height:1.6;}
        .benefits{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:28px;}
        .benefit{background:rgba(255,255,255,0.04);border:1px solid rgba(106,13,173,0.3);border-radius:14px;padding:14px 10px;text-align:center;}
        .benefit-icon{font-size:1.6em;margin-bottom:6px;}
        .benefit-text{font-size:0.75em;color:#d4af37;font-weight:700;}
        .card{background:rgba(26,11,46,0.8);border:1px solid #331a5e;border-radius:20px;padding:22px;}
        .label{font-size:0.85em;color:#d4af37;font-weight:700;margin-bottom:8px;}
        .input{width:100%;background:#0a0118;border:1px solid #6a0dad;padding:14px;border-radius:12px;color:#fff;font-size:1em;font-family:'Cairo',sans-serif;margin-bottom:16px;direction:rtl;outline:none;}
        .input:focus{border-color:#d4af37;}
        .btn-primary{background:linear-gradient(135deg,#6a0dad,#d4af37);color:white;border:none;padding:14px;border-radius:14px;font-weight:900;cursor:pointer;font-size:1em;width:100%;font-family:'Cairo',sans-serif;}
        .btn-primary:disabled{opacity:0.6;cursor:not-allowed;}
        .btn-login{background:rgba(106,13,173,0.3);border:1px solid #6a0dad;color:#fff;padding:14px;border-radius:14px;font-weight:700;cursor:pointer;font-size:1em;width:100%;font-family:'Cairo',sans-serif;margin-bottom:12px;}
        .status-box{border-radius:20px;padding:30px 20px;text-align:center;}
        .status-pending{background:rgba(234,179,8,0.08);border:2px solid #eab308;}
        .status-approved{background:rgba(34,197,94,0.08);border:2px solid #22c55e;}
        .status-rejected{background:rgba(239,68,68,0.08);border:2px solid #ef4444;}
        .status-icon{font-size:3em;margin-bottom:12px;}
        .status-title{font-size:1.2em;font-weight:900;margin-bottom:8px;}
        .status-desc{font-size:0.82em;color:#b0b0b0;line-height:1.7;}
        .user-bar{background:rgba(106,13,173,0.2);border:1px solid rgba(106,13,173,0.4);border-radius:12px;padding:10px 14px;display:flex;align-items:center;gap:10px;margin-bottom:16px;}
        .user-avatar{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#6a0dad,#d4af37);display:flex;align-items:center;justify-content:center;font-weight:900;flex-shrink:0;}
        .toast{position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:#6a0dad;padding:10px 20px;border-radius:20px;font-size:0.85em;z-index:2000;white-space:nowrap;}
        .divider{height:1px;background:rgba(255,255,255,0.06);margin:20px 0;}
        .back-btn{background:rgba(255,255,255,0.08);border:none;color:#fff;padding:8px 16px;border-radius:10px;cursor:pointer;font-family:'Cairo',sans-serif;font-size:0.85em;}
      `}</style>

      <div className="header">
        <button className="back-btn" onClick={() => window.history.back()}>← رجوع</button>
        <div className="badge">🏪</div>
        <div>
          <div style={{fontWeight:900, fontSize:'0.9em'}}>انضم كتاجر</div>
          <div style={{fontSize:'0.65em', color:'#d4af37'}}>Souq Pi V3</div>
        </div>
      </div>

      <div className="container">

        <div className="hero">
          <div className="hero-icon">🛍️</div>
          <div className="hero-title">ابدأ البيع في <span style={{color:'#d4af37'}}>سوق Pi</span></div>
          <div className="hero-sub">انضم إلى آلاف التجار وابدأ البيع بعملة Pi<br/>على أكبر سوق إلكتروني في شبكة Pi</div>
        </div>

        <div className="benefits">
          {[
            { icon: '🚀', text: 'إضافة منتجاتك بسهولة' },
            { icon: 'π', text: 'استقبل مدفوعات Pi' },
            { icon: '🌍', text: 'وصول لآلاف المشترين' },
            { icon: '🔒', text: 'منصة آمنة وموثوقة' },
          ].map((b, i) => (
            <div key={i} className="benefit">
              <div className="benefit-icon">{b.icon}</div>
              <div className="benefit-text">{b.text}</div>
            </div>
          ))}
        </div>

        <div className="card">

          {!user && (
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:'0.9em', color:'#b0b0b0', marginBottom:16}}>
                سجّل الدخول بحساب Pi لتتمكن من إرسال طلبك
              </div>
              <button className="btn-login" onClick={loginWithPi}>
                🔑 تسجيل الدخول بـ Pi
              </button>
            </div>
          )}

          {user && loading && (
            <div style={{textAlign:'center', padding:20, color:'#b0b0b0'}}>
              جاري التحقق من حالتك...
            </div>
          )}

          {user && !loading && (
            <>
              <div className="user-bar">
                <div className="user-avatar">{user.username[0].toUpperCase()}</div>
                <div>
                  <div style={{fontWeight:700, fontSize:'0.9em'}}>@{user.username}</div>
                  <div style={{fontSize:'0.7em', color:'#b0b0b0'}}>مسجل الدخول ✅</div>
                </div>
              </div>

              <div className="divider" />

              {status === 'not_found' && (
                <>
                  <div className="label">🏪 اسم متجرك</div>
                  <input
                    className="input"
                    type="text"
                    placeholder="مثال: متجر أحمد للإلكترونيات"
                    value={shopName}
                    onChange={e => setShopName(e.target.value)}
                    maxLength={50}
                  />
                  <div style={{fontSize:'0.75em', color:'#b0b0b0', marginBottom:16, marginTop:-10}}>
                    اختر اسماً مميزاً ويعبّر عن منتجاتك
                  </div>
                  <button
                    className="btn-primary"
                    onClick={submitRequest}
                    disabled={submitting || !shopName.trim()}
                  >
                    {submitting ? 'جاري الإرسال...' : '🚀 أرسل طلب الانضمام'}
                  </button>
                </>
              )}

              {status === 'pending' && (
                <div className="status-box status-pending">
                  <div className="status-icon">⏳</div>
                  <div className="status-title" style={{color:'#eab308'}}>طلبك قيد المراجعة</div>
                  <div className="status-desc">
                    تم استلام طلبك بنجاح!<br/>
                    سيراجع فريقنا طلبك ويرد عليك قريباً.<br/>
                    تفقد هذه الصفحة لاحقاً لمعرفة النتيجة.
                  </div>
                </div>
              )}

              {status === 'approved' && (
                <div className="status-box status-approved">
                  <div className="status-icon">🎉</div>
                  <div className="status-title" style={{color:'#22c55e'}}>مبروك! أنت تاجر معتمد</div>
                  <div className="status-desc">
                    تمت الموافقة على طلبك!<br/>
                    يمكنك الآن إضافة منتجاتك والبدء بالبيع<br/>
                    في سوق Pi مباشرةً.
                  </div>
                  <button
                    className="btn-primary"
                    style={{marginTop:16}}
                    onClick={() => window.location.href = '/add-product'}
                  >
                    ➕ أضف منتجك الأول
                  </button>
                </div>
              )}

              {status === 'rejected' && (
                <div className="status-box status-rejected">
                  <div className="status-icon">❌</div>
                  <div className="status-title" style={{color:'#ef4444'}}>تم رفض طلبك</div>
                  <div className="status-desc">
                    نأسف، لم تتم الموافقة على طلبك في الوقت الحالي.<br/>
                    يمكنك التواصل مع الإدارة لمعرفة السبب<br/>
                    أو إعادة التقديم لاحقاً.
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
