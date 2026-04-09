import { useState, useEffect } from 'react';
import Head from 'next/head';
import { usePiPrice } from '../context/PiPriceContext';

const ADMIN = 'alhawawsheh1524';

const sections = [
  { key: 'Cars', ar: 'سيارات', icon: '🚗', gradient: 'linear-gradient(135deg,#1a0b2e,#6a0dad)' },
  { key: 'Electric', ar: 'كهربائيات', icon: '⚡', gradient: 'linear-gradient(135deg,#1a0b2e,#d4af37)' },
  { key: 'Electronics', ar: 'إلكترونيات', icon: '📱', gradient: 'linear-gradient(135deg,#2d1b69,#6a0dad)' },
  { key: 'Real_Estate', ar: 'عقارات', icon: '🏠', gradient: 'linear-gradient(135deg,#1a0b2e,#4a1942)' },
];

const FEATURED = [
  { icon: '🚗', title: 'أحدث السيارات', sub: 'تويوتا · هيونداي · BMW' },
  { icon: '📱', title: 'إلكترونيات 2026', sub: 'آيفون · سامسونج · سوني' },
  { icon: '🏠', title: 'عقارات مميزة', sub: 'فلل · شقق · أراضي' },
];

export default function Home() {
  const piPrice = usePiPrice();
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('home');
  const [section, setSection] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [paying, setPaying] = useState(null);
  const [calcPi, setCalcPi] = useState('');
  const [featuredIdx, setFeaturedIdx] = useState(0);

  useEffect(() => {
    const initPi = () => {
      if (typeof window !== 'undefined' && window.Pi) {
        window.Pi.init({ version: "2.0", sandbox: false }, {
          onIncompletePaymentFound: async (payment) => {
            try {
              await fetch('/api/payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'approve', paymentId: payment.identifier }) });
              await fetch('/api/payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'complete', paymentId: payment.identifier, txid: payment.transaction?.txid || payment.identifier }) });
              window.Pi.completePayment(payment.identifier);
            } catch(e) {}
          }
        });
      }
    };
    initPi();
    const t = setInterval(() => setFeaturedIdx(i => (i + 1) % FEATURED.length), 4000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { if (section) loadProducts(section); }, [section]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function loginWithPi() {
    try {
      if (!window.Pi) { showToast('يرجى الفتح من متصفح Pi'); return; }
      const auth = await window.Pi.authenticate(['username', 'payments', 'wallet_address']);
      setUser(auth.user);
      showToast(`مرحباً @${auth.user.username}`);
    } catch(e) { showToast('فشل تسجيل الدخول'); }
  }

  async function loadProducts(table) {
    setLoading(true); setProducts([]);
    try {
      const res = await fetch(`/api/products?table=${table}`);
      const data = await res.json();
      setProducts(data.records || []);
    } catch(e) { showToast('خطأ في تحميل البيانات'); }
    setLoading(false);
  }

  async function buyWithPi(product) {
    if (!user) { loginWithPi(); return; }
    if (paying) return;
    setPaying(product.id);

    const callbacks = {
      onReadyForServerApproval: async (paymentId) => {
        await fetch('/api/payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'approve', paymentId }) });
      },
      onReadyForServerCompletion: async (paymentId, txid) => {
        await fetch('/api/payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'complete', paymentId, txid }) });
        window.Pi.completePayment(paymentId);
        showToast('✅ تم الشراء بنجاح!');
        setPaying(null);
      },
      onCancel: () => setPaying(null),
      onError: () => setPaying(null)
    };

    try {
      window.Pi.createPayment({
        amount: Number(product.fields.price_pi),
        memo: `شراء: ${product.fields.name}`,
        metadata: { productId: product.id, table: section }
      }, callbacks);
    } catch(e) { setPaying(null); }
  }

  return (
    <>
      <Head>
        <title>Souq Pi - V3</title>
        <script src="https://sdk.minepi.com/pi-sdk.js"></script>
        <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        body{background:#0a0118;color:#fff;font-family:'Cairo',sans-serif;direction:rtl;padding-bottom:100px;margin:0;}
        .navbar{display:flex;align-items:center;justify-content:space-between;padding:12px 20px;background:rgba(26,11,46,0.95);position:sticky;top:0;z-index:100;border-bottom:1px solid #d4af37;}
        .navbar-logo{width:38px;height:38px;background:linear-gradient(135deg,#6a0dad,#d4af37);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;}
        .pi-price-bar{background:rgba(212,175,55,0.1);border:1px solid #d4af37;border-radius:20px;padding:4px 12px;font-size:0.8em;color:#d4af37;}
        .login-btn{background:linear-gradient(135deg,#6a0dad,#d4af37);color:white;border:none;padding:8px 18px;border-radius:20px;font-weight:700;cursor:pointer;}
        .hero{padding:20px;text-align:center;}
        .featured-slider{background:rgba(255,255,255,0.04);border-radius:20px;padding:25px;margin-bottom:20px;border:1px solid rgba(255,255,255,0.1);}
        .calc-box{background:rgba(106,13,173,0.1);border:1px solid #6a0dad;border-radius:20px;padding:15px;margin:20px 0;}
        .calc-input{width:100%;background:#0a0118;border:1px solid #6a0dad;padding:12px;border-radius:12px;color:#fff;text-align:center;font-size:1em;box-sizing:border-box;font-family:'Cairo',sans-serif;outline:none;}
        .categories{display:grid;grid-template-columns:1fr 1fr;gap:15px;}
        .cat-card{border-radius:20px;padding:25px 10px;cursor:pointer;border:1px solid rgba(255,255,255,0.05);text-align:center;}
        .products{padding:15px;display:grid;grid-template-columns:1fr 1fr;gap:12px;}
        .pcard{background:#1a0b2e;border:1px solid #331a5e;border-radius:15px;overflow:hidden;}
        .pimg{width:100%;height:110px;object-fit:cover;}
        .pinfo{padding:10px;}
        .pprice{color:#d4af37;font-weight:900;margin:4px 0;font-size:0.9em;}
        .buybtn{background:linear-gradient(135deg,#6a0dad,#d4af37);color:white;border:none;padding:8px;border-radius:10px;width:100%;font-weight:700;cursor:pointer;}
        .bottom-nav{position:fixed;bottom:0;left:0;right:0;background:#1a0b2e;display:flex;justify-content:space-around;padding:12px;border-top:1px solid #6a0dad;z-index:1000;}
        .nav-item{text-align:center;color:#b0b0b0;font-size:0.7em;cursor:pointer;flex:1;}
        .nav-item.active{color:#d4af37;font-weight:bold;}
        .toast{position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#6a0dad;padding:8px 15px;border-radius:20px;font-size:0.8em;z-index:2000;}
        .sell-banner{margin:16px 0 0;background:linear-gradient(135deg,rgba(106,13,173,0.3),rgba(212,175,55,0.2));border:1px solid rgba(212,175,55,0.4);border-radius:16px;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;}
        .sell-banner-btn{background:linear-gradient(135deg,#6a0dad,#d4af37);color:white;border:none;padding:7px 14px;border-radius:10px;font-weight:700;font-size:0.78em;cursor:pointer;font-family:'Cairo',sans-serif;white-space:nowrap;}
      `}</style>

      <nav className="navbar">
        <div className="navbar-brand" onClick={() => {setPage('home'); setSection(null);}} style={{cursor:'pointer', display:'flex', gap:'8px', alignItems:'center'}}>
          <div className="navbar-logo">π</div>
          <div style={{textAlign:'right'}}><div style={{fontWeight:900, fontSize:'0.85em'}}>Souq Pi</div><div style={{fontSize:'0.55em',color:'#d4af37'}}>V3 Testnet</div></div>
        </div>
        <div className="pi-price-bar">π = {piPrice ? `$${piPrice.toFixed(4)}` : '...'}</div>
        {user ? <div style={{color:'#d4af37', fontWeight:700, fontSize:'0.75em'}}>@{user.username}</div> : <button className="login-btn" onClick={loginWithPi}>دخول</button>}
      </nav>

      {page === 'home' ? (
        <div className="hero">
          <h1 style={{fontSize:'2.2em', fontWeight:900, marginBottom:10}}>سوق بي <span style={{color:'#d4af37'}}>المطور</span></h1>

          <div className="featured-slider">
            <span style={{fontSize:'2.2em'}}>{FEATURED[featuredIdx].icon}</span>
            <div style={{fontWeight:800, marginTop:8}}>{FEATURED[featuredIdx].title}</div>
            <div style={{fontSize:'0.65em', color:'#b0b0b0'}}>{FEATURED[featuredIdx].sub}</div>
          </div>

          <div className="calc-box">
            <input
              className="calc-input"
              type="number"
              value={calcPi}
              onChange={e => setCalcPi(e.target.value)}
              placeholder="أدخل كمية π لِحساب قيمتها"
            />
            <div style={{marginTop:8, color:'#4ade80', fontWeight:800, fontSize:'1.1em', textAlign:'center'}}>
              {'$ '}{calcPi && piPrice ? (calcPi * piPrice).toFixed(2) : '0.00'}
            </div>
          </div>

          <div className="categories">
            {sections.map(s => (
              <div key={s.key} className="cat-card" style={{background:s.gradient}} onClick={() => {setSection(s.key); setPage('section');}}>
                <span style={{fontSize:'2.5em', display:'block'}}>{s.icon}</span>
                <div style={{fontWeight:800, fontSize:'0.9em'}}>{s.ar}</div>
              </div>
            ))}
          </div>

          <div className="sell-banner" onClick={() => window.location.href = '/become-seller'}>
            <div style={{textAlign:'right'}}>
              <div style={{fontWeight:800, fontSize:'0.88em'}}>🏪 هل تريد البيع؟</div>
              <div style={{fontSize:'0.68em', color:'#b0b0b0', marginTop:2}}>انضم كتاجر وابدأ البيع بـ Pi</div>
            </div>
            <button className="sell-banner-btn">انضم الآن ←</button>
          </div>

        </div>
      ) : (
        <div className="section-page">
          <div style={{padding:'12px', display:'flex', alignItems:'center', gap:10}}>
            <button onClick={() => {setPage('home'); setSection(null);}} style={{background:'rgba(255,255,255,0.1)', border:'none', color:'#fff', borderRadius:8, padding:'8px 15px', cursor:'pointer'}}>← رجوع</button>
            <h2 style={{fontSize:'1em'}}>قسم {sections.find(s=>s.key===section)?.ar}</h2>
          </div>
          <div className="products">
            {loading ? <div style={{gridColumn:'1/3', textAlign:'center', padding:40}}>جاري التحميل...</div> :
              products.map(r => (
                <div key={r.id} className="pcard">
                  <img className="pimg" src={r.fields.image_url || '/placeholder.png'} />
                  <div className="pinfo">
                    <div style={{fontSize:'0.75em', fontWeight:700, height:'35px', overflow:'hidden'}}>{r.fields.name}</div>
                    <div className="pprice">π {r.fields.price_pi}</div>
                    <button className="buybtn" onClick={() => buyWithPi(r)} disabled={paying === r.id}>{paying === r.id ? 'جاري...' : 'شراء الآن'}</button>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}

      <div className="bottom-nav">
        <div className={`nav-item ${page==='home'?'active':''}`} onClick={() => {setPage('home'); setSection(null);}}>🏠<br/>الرئيسية</div>
        <div className="nav-item" onClick={() => showToast('قريباً: قسم الاستكشاف')}>🔍<br/>استكشف</div>
        <div className="nav-item" onClick={() => showToast('السلة فارغة')}>🛒<br/>السلة</div>
        <div className="nav-item" onClick={() => window.location.href = '/become-seller'}>🏪<br/>بيّع</div>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
