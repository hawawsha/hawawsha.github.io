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
        window.Pi.init({ version: "2.0", sandbox: true }, {
          onIncompletePaymentFound: async (p) => {
            try {
              await fetch('/api/payment', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ action: 'approve', paymentId: p.identifier }) });
              await fetch('/api/payment', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ action: 'complete', paymentId: p.identifier, txid: p.transaction?.txid }) });
              window.Pi.completePayment(p.identifier);
            } catch(e) {}
          }
        });
      } else {
        setTimeout(initPi, 500);
      }
    };
    initPi();
    const t = setInterval(() => setFeaturedIdx(i => (i + 1) % FEATURED.length), 4000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { if (section) loadProducts(section); }, [section]);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 3000); };

  async function loginWithPi() {
    try {
      if (!window.Pi) { showToast('يرجى الفتح من متصفح Pi'); return; }
      const auth = await window.Pi.authenticate(['username', 'payments', 'wallet_address']);
      setUser(auth.user);
      showToast(`مرحباً @${auth.user.username}`);
    } catch(e) { showToast('فشل الدخول'); }
  }

  async function loadProducts(t) {
    setLoading(true);
    try {
      const res = await fetch(`/api/products?table=${t}`);
      const d = await res.json();
      setProducts(d.records || []);
    } catch(e) { showToast('خطأ في التحميل'); }
    setLoading(false);
  }

  async function buyWithPi(p) {
    if (!user) { loginWithPi(); return; }
    setPaying(p.id);
    const callbacks = {
      onReadyForServerApproval: (id) => fetch('/api/payment', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ action: 'approve', paymentId: id })
      }),
      onReadyForServerCompletion: (id, tx) => {
        // ✅ يحفظ الطلب في Orders
        fetch('/api/payment', {
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
            tableName: section
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
        <title>Souq Pi - V3</title>
        <script src="https://sdk.minepi.com/pi-sdk.js"></script>
        <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        body{background:#0a0118;color:#fff;font-family:'Cairo',sans-serif;direction:rtl;margin:0;padding-bottom:100px;}
        .navbar{display:flex;align-items:center;justify-content:space-between;padding:12px 20px;background:#1a0b2e;border-bottom:1px solid #d4af37;position:sticky;top:0;z-index:100;}
        .navbar-logo{width:38px;height:38px;background:linear-gradient(135deg,#6a0dad,#d4af37);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;}
        .hero{padding:20px;text-align:center;}
        .featured-slider{background:rgba(255,255,255,0.04);border-radius:20px;padding:25px;margin-bottom:20px;border:1px solid rgba(255,255,255,0.1);}
        .calc-box{background:rgba(106,13,173,0.1);border:1px solid #6a0dad;border-radius:20px;padding:15px;margin:20px 0;}
        .calc-input{width:100%;background:#0a0118;border:1px solid #6a0dad;padding:12px;border-radius:12px;color:#fff;text-align:center;outline:none;font-family:'Cairo';box-sizing:border-box;}
        .categories{display:grid;grid-template-columns:1fr 1fr;gap:15px;}
        .cat-card{border-radius:20px;padding:25px 10px;cursor:pointer;text-align:center;}
        .products{padding:15px;display:grid;grid-template-columns:1fr 1fr;gap:12px;}
        .pcard{background:#1a0b2e;border:1px solid #331a5e;border-radius:15px;overflow:hidden;}
        .pimg{width:100%;height:110px;object-fit:cover;}
        .pinfo{padding:10px;}
        .buybtn{background:linear-gradient(135deg,#6a0dad,#d4af37);color:#fff;border:none;padding:8px;border-radius:10px;width:100%;font-weight:700;cursor:pointer;font-family:'Cairo';}
        .bottom-nav{position:fixed;bottom:0;left:0;right:0;background:#1a0b2e;display:flex;justify-content:space-around;padding:12px;border-top:1px solid #6a0dad;z-index:1000;}
        .nav-item{text-align:center;font-size:0.7em;cursor:pointer;color:#b0b0b0;flex:1;}
        .toast{position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#6a0dad;padding:10px 20px;border-radius:20px;z-index:2000;}
        .sell-banner{margin-top:20px;background:rgba(212,175,55,0.1);border:1px solid #d4af37;border-radius:15px;padding:15px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;}
      `}</style>

      <nav className="navbar">
        <div onClick={() => {setPage('home'); setSection(null);}} style={{display:'flex', gap:'8px', alignItems:'center', cursor:'pointer'}}>
          <div className="navbar-logo">π</div>
          <div style={{fontWeight:900}}>Souq Pi <small style={{color:'#d4af37'}}>V3</small></div>
        </div>
        {user ? <div style={{color:'#d4af37', fontSize:'0.8em'}}>@{user.username}</div> : <button onClick={loginWithPi} style={{background:'#d4af37', border:'none', padding:'6px 15px', borderRadius:'20px', fontWeight:700, fontFamily:'Cairo', cursor:'pointer'}}>دخول</button>}
      </nav>

      {page === 'home' ? (
        <div className="hero">
          <div className="featured-slider">
            <div style={{fontSize:'2.2em'}}>{FEATURED[featuredIdx].icon}</div>
            <div style={{fontWeight:800}}>{FEATURED[featuredIdx].title}</div>
            <div style={{fontSize:'0.66em', color:'#b0b0b0'}}>{FEATURED[featuredIdx].sub}</div>
          </div>

          <div className="calc-box">
            <input
              className="calc-input"
              type="number"
              value={calcPi}
              onChange={e => setCalcPi(e.target.value)}
              placeholder="كمية π"
            />
            <div style={{marginTop:10, color:'#4ade80', fontWeight:900, textAlign:'center'}}>
              $ {calcPi && piPrice ? (calcPi * piPrice).toFixed(2) : '0.00'}
            </div>
          </div>

          <div className="categories">
            {sections.map(s => (
              <div key={s.key} className="cat-card" style={{background:s.gradient}} onClick={() => {setSection(s.key); setPage('section');}}>
                <div style={{fontSize:'2.5em'}}>{s.icon}</div>
                <div style={{fontWeight:700}}>{s.ar}</div>
              </div>
            ))}
          </div>

          <div className="sell-banner" onClick={() => window.location.href = '/become-seller'}>
            <div style={{textAlign:'right'}}>
              <div style={{fontWeight:800}}>🏪 هل تريد البيع؟</div>
              <div style={{fontSize:'0.7em', color:'#b0b0b0'}}>انضم كتاجر الآن</div>
            </div>
            <button style={{background:'#d4af37', border:'none', padding:'5px 12px', borderRadius:'10px', fontWeight:700, fontFamily:'Cairo', cursor:'pointer'}}>انضم ←</button>
          </div>
        </div>
      ) : (
        <div className="section-page">
          <button onClick={() => {setPage('home'); setSection(null);}} style={{margin:'15px', background:'none', border:'1px solid #fff', color:'#fff', padding:'6px 12px', borderRadius:'8px', cursor:'pointer', fontFamily:'Cairo'}}>← رجوع</button>
          <div className="products">
            {loading ? <p style={{gridColumn:'1/3', textAlign:'center', padding:40}}>جاري التحميل...</p> : products.map(r => (
              <div key={r.id} className="pcard">
                <img className="pimg" src={r.fields.image_url || '/placeholder.png'} alt="" />
                <div className="pinfo">
                  <div style={{fontSize:'0.75em', fontWeight:700, height:'35px', overflow:'hidden'}}>{r.fields.name}</div>
                  <div style={{color:'#d4af37', fontWeight:900, margin:'5px 0'}}>π {Number(r.fields.price_pi).toFixed(2)}</div>
                  <button className="buybtn" onClick={() => buyWithPi(r)} disabled={paying === r.id}>
                    {paying === r.id ? 'جاري...' : 'شراء'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bottom-nav">
        <div className="nav-item" onClick={() => {setPage('home'); setSection(null);}}>🏠<br/>الرئيسية</div>
        <div className="nav-item" onClick={() => showToast('قريباً')}>🔍<br/>استكشف</div>
        <div className="nav-item" onClick={() => window.location.href = '/my-orders'}>📦<br/>طلباتي</div>
        <div className="nav-item" onClick={() => window.location.href = '/become-seller'}>🏪<br/>بيّع</div>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
