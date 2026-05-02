// pages/explore.js
import { useState, useEffect } from 'react';
import Head from 'next/head';

const SECTIONS = [
  { key: 'Cars', ar: 'سيارات', icon: '🚗' },
  { key: 'Electric', ar: 'كهربائيات', icon: '⚡' },
  { key: 'Electronics', ar: 'إلكترونيات', icon: '📱' },
  { key: 'Real_Estate', ar: 'عقارات', icon: '🏠' },
];

export default function Explore() {
  const [allProducts, setAllProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [paying, setPaying] = useState(null);
  const [user, setUser] = useState(null);
  const [activeSection, setActiveSection] = useState('all');

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  useEffect(() => {
    const initPi = () => {
      if (typeof window !== 'undefined' && window.Pi) {
        window.Pi.init({ version: "2.0", sandbox: false }, {
          onIncompletePaymentFound: async (p) => {
            try {
              await fetch('/api/payment', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ action: 'approve', paymentId: p.identifier }) });
              await fetch('/api/payment', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ action: 'complete', paymentId: p.identifier, txid: p.transaction?.txid }) });
            } catch(e) {}
          }
        });
        // محاولة تسجيل دخول صامت
        window.Pi.authenticate(['username', 'payments', 'wallet_address'])
          .then(auth => setUser(auth.user))
          .catch(() => {});
      } else {
        setTimeout(initPi, 500);
      }
    };
    initPi();
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const results = await Promise.all(
        SECTIONS.map(s =>
          fetch(`/api/products?table=${s.key}`)
            .then(r => r.json())
            .then(d => (d.records || []).map(p => ({ ...p, _section: s.key, _sectionAr: s.ar, _sectionIcon: s.icon })))
            .catch(() => [])
        )
      );
      const all = results.flat();
      setAllProducts(all);
      setFiltered(all);
    } catch (e) {
      showToast('خطأ في التحميل');
    }
    setLoading(false);
  }

  useEffect(() => {
    let result = allProducts;
    if (activeSection !== 'all') {
      result = result.filter(p => p._section === activeSection);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(p =>
        (p.fields.name || '').toLowerCase().includes(q) ||
        (p._sectionAr || '').includes(q)
      );
    }
    setFiltered(result);
  }, [search, activeSection, allProducts]);

  async function buyWithPi(p) {
    if (!user) { showToast('سجّل الدخول أولاً من الصفحة الرئيسية'); return; }
    setPaying(p.id);
    const callbacks = {
      onReadyForServerApproval: async (id) => {
        await fetch('/api/payment', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ action: 'approve', paymentId: id })
        });
      },
      onReadyForServerCompletion: async (id, tx) => {
        await fetch('/api/payment', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({
            action: 'complete',
            paymentId: id,
            txid: tx,
            username: user.username,
            productId: p.id,
            productName: p.fields.name,
            amountPi: p.fields.price_pi,
            tableName: p._section
          })
        });
        window.Pi.completePayment(id);
        showToast('✅ تم الشراء بنجاح!');
        setPaying(null);
      },
      onCancel: () => setPaying(null),
      onError: () => setPaying(null)
    };
    window.Pi.createPayment({
      amount: Number(p.fields.price_pi),
      memo: p.fields.name,
      metadata: { id: p.id }
    }, callbacks);
  }

  return (
    <>
      <Head>
        <title>استكشف - Souq Pi</title>
        <script src="https://sdk.minepi.com/pi-sdk.js"></script>
        <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#0a0118;color:#fff;font-family:'Cairo',sans-serif;direction:rtl;min-height:100vh;padding-bottom:100px;}
        .header{background:rgba(26,11,46,0.95);padding:14px 16px;border-bottom:1px solid #d4af37;position:sticky;top:0;z-index:100;display:flex;align-items:center;gap:10px;}
        .back-btn{background:rgba(255,255,255,0.08);border:none;color:#fff;padding:8px 14px;border-radius:10px;cursor:pointer;font-family:'Cairo',sans-serif;font-size:0.85em;}
        .search-wrap{flex:1;position:relative;}
        .search-input{width:100%;background:#1a0b2e;border:1.5px solid #6a0dad;padding:10px 16px 10px 36px;border-radius:14px;color:#fff;font-family:'Cairo',sans-serif;font-size:0.9em;outline:none;}
        .search-input::placeholder{color:#666;}
        .search-icon{position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:1em;pointer-events:none;}
        .filters{display:flex;gap:8px;padding:12px 16px;overflow-x:auto;scrollbar-width:none;}
        .filters::-webkit-scrollbar{display:none;}
        .filter-btn{flex-shrink:0;padding:7px 16px;border-radius:20px;border:1px solid #331a5e;background:none;color:#b0b0b0;font-family:'Cairo',sans-serif;font-size:0.8em;font-weight:700;cursor:pointer;white-space:nowrap;}
        .filter-btn.active{background:linear-gradient(135deg,#6a0dad,#d4af37);color:#fff;border-color:transparent;}
        .count{padding:4px 16px 10px;font-size:0.78em;color:#b0b0b0;}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:0 12px;}
        .pcard{background:#1a0b2e;border:1px solid #331a5e;border-radius:15px;overflow:hidden;}
        .pimg{width:100%;height:110px;object-fit:cover;}
        .pinfo{padding:10px;}
        .pname{font-size:0.75em;font-weight:700;height:35px;overflow:hidden;line-height:1.3;}
        .ptag{display:inline-block;background:rgba(106,13,173,0.3);border:1px solid #6a0dad;border-radius:6px;padding:1px 8px;font-size:0.65em;color:#c084fc;margin:4px 0;}
        .pprice{color:#d4af37;font-weight:900;margin:5px 0;font-size:0.9em;}
        .buybtn{background:linear-gradient(135deg,#6a0dad,#d4af37);color:#fff;border:none;padding:8px;border-radius:10px;width:100%;font-weight:700;cursor:pointer;font-family:'Cairo';font-size:0.82em;}
        .buybtn:disabled{opacity:0.6;}
        .empty{text-align:center;padding:60px 20px;color:#b0b0b0;}
        .loading{text-align:center;padding:60px;color:#b0b0b0;}
        .toast{position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#6a0dad;padding:10px 20px;border-radius:20px;z-index:2000;max-width:90%;text-align:center;font-size:0.82em;}
        .bottom-nav{position:fixed;bottom:0;left:0;right:0;background:#1a0b2e;display:flex;justify-content:space-around;padding:12px;border-top:1px solid #6a0dad;z-index:1000;}
        .nav-item{text-align:center;font-size:0.7em;cursor:pointer;color:#b0b0b0;flex:1;}
        .nav-item.active{color:#d4af37;}
      `}</style>

      <div className="header">
        <button className="back-btn" onClick={() => window.location.href = '/'}>← رجوع</button>
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            placeholder="ابحث عن منتج..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
        </div>
      </div>

      <div className="filters">
        <button className={`filter-btn ${activeSection === 'all' ? 'active' : ''}`} onClick={() => setActiveSection('all')}>
          🛍️ الكل
        </button>
        {SECTIONS.map(s => (
          <button
            key={s.key}
            className={`filter-btn ${activeSection === s.key ? 'active' : ''}`}
            onClick={() => setActiveSection(s.key)}
          >
            {s.icon} {s.ar}
          </button>
        ))}
      </div>

      {!loading && (
        <div className="count">
          {filtered.length === 0 ? 'لا توجد نتائج' : `${filtered.length} منتج`}
        </div>
      )}

      {loading ? (
        <div className="loading">⏳ جاري تحميل المنتجات...</div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          <div style={{fontSize:'3em', marginBottom:12}}>🔍</div>
          <div style={{fontWeight:800, marginBottom:6}}>لا توجد نتائج</div>
          <div style={{fontSize:'0.82em'}}>جرب كلمة بحث مختلفة</div>
        </div>
      ) : (
        <div className="grid">
          {filtered.map(p => (
            <div key={p.id} className="pcard">
              <img className="pimg" src={p.fields.image_url || '/placeholder.png'} alt="" />
              <div className="pinfo">
                <div className="pname">{p.fields.name}</div>
                <div className="ptag">{p._sectionIcon} {p._sectionAr}</div>
                <div className="pprice">π {Number(p.fields.price_pi).toFixed(2)}</div>
                <button className="buybtn" onClick={() => buyWithPi(p)} disabled={paying === p.id}>
                  {paying === p.id ? '...' : 'شراء'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bottom-nav">
        <div className="nav-item" onClick={() => window.location.href = '/'}>🏠<br/>الرئيسية</div>
        <div className="nav-item active">🔍<br/>استكشف</div>
        <div className="nav-item" onClick={() => window.location.href = '/my-orders'}>📦<br/>طلباتي</div>
        <div className="nav-item" onClick={() => window.location.href = '/become-seller'}>🏪<br/>بيّع</div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
