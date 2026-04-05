import { useState, useEffect } from 'react';
import Head from 'next/head';
import { usePiPrice } from '../context/PiPriceContext';

const ADMIN = 'alhawawsheh1524';
const CONSENSUS_PRICE = 314159;

const sections = [
  { key: 'Cars', ar: 'سيارات', en: 'Cars', icon: '🚗', gradient: 'linear-gradient(135deg,#1a1a2e,#16213e)', count: '24 سيارة' },
  { key: 'Electric', ar: 'كهربائيات', en: 'Electric', icon: '⚡', gradient: 'linear-gradient(135deg,#0f3460,#533483)', count: '18 منتج' },
  { key: 'Electronics', ar: 'إلكترونيات', en: 'Electronics', icon: '📱', gradient: 'linear-gradient(135deg,#2d1b69,#11998e)', count: '32 منتج' },
  { key: 'Real_Estate', ar: 'عقارات', en: 'Real Estate', icon: '🏠', gradient: 'linear-gradient(135deg,#4a1942,#c84b31)', count: '12 عقار' },
];

const FEATURED = [
  { icon: '🚗', title: 'أحدث السيارات', sub: 'تويوتا · هيونداي · BMW' },
  { icon: '📱', title: 'إلكترونيات 2026', sub: 'آيفون · سامسونج · سوني' },
  { icon: '🏠', title: 'عقارات مميزة', sub: 'فلل · شقق · أراضي' },
  { icon: '⚡', title: 'أجهزة منزلية', sub: 'ثلاجات · غسالات · شاشات' },
];

export default function Home() {
  const piPrice = usePiPrice();
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('home');
  const [section, setSection] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('info');
  const [paying, setPaying] = useState(null);
  const [featuredIdx, setFeaturedIdx] = useState(0);
  const [search, setSearch] = useState('');
  const [calcPi, setCalcPi] = useState('');
  const [form, setForm] = useState({ name:'', price_pi:'', description:'', image_url:'', brand:'', year:'', location:'', type:'Villa', condition:'New', status:'Available' });

  const [refunds, setRefunds] = useState([]);
  const [showRefunds, setShowRefunds] = useState(false);
  const [refundingId, setRefundingId] = useState(null);

  const isAdmin = user && user.username === ADMIN;

  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof window !== 'undefined' && window.Pi) {
      window.Pi.init({ version: "2.0", sandbox: true }, {
          onIncompletePaymentFound: async (payment) => {
            try {
              await fetch('/api/payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'approve', paymentId: payment.identifier })
              });
              await fetch('/api/payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'complete', paymentId: payment.identifier, txid: payment.transaction?.txid || payment.identifier })
              });
              window.Pi.completePayment(payment.identifier);
            } catch(e) {}
          }
        });
        clearInterval(interval);
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setFeaturedIdx(i => (i + 1) % FEATURED.length), 3000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { if (section) loadProducts(section); }, [section]);

  // التعديل 1: تحديث قائمة طلبات الاسترجاع تلقائياً كل دقيقة للأدمن
  useEffect(() => {
    if (isAdmin) {
      loadRefunds();
      const interval = setInterval(loadRefunds, 60000);
      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  function showToast(msg, type = 'info') {
    setToast(msg); setToastType(type);
    setTimeout(() => setToast(''), 5000);
  }

  async function loginWithPi() {
    if (!window.Pi) { showToast('افتح داخل Pi Browser', 'error'); return; }
    try {
      const auth = await window.Pi.authenticate(['username', 'payments', 'wallet_address']);
      if (auth && auth.user) {
        setUser(auth.user);
        showToast('مرحباً ' + auth.user.username + ' 👋', 'success');
        try {
          await fetch('/api/send-pi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uid: auth.user.uid }) });
        } catch(e) {}
      }
    } catch(e) { showToast('فشل تسجيل الدخول', 'error'); }
  }

  async function loadProducts(table) {
    setLoading(true); setProducts([]);
    try {
      const res = await fetch(`/api/products?table=${table}`);
      const data = await res.json();
      setProducts(data.records || []);
    } catch(e) { showToast('خطأ في التحميل', 'error'); }
    setLoading(false);
  }

  // التعديل 2: إضافة تتبع للأخطاء في جلب الاسترجاع
  async function loadRefunds() {
    try {
      const res = await fetch('/api/refund', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'list' }) });
      const data = await res.json();
      setRefunds(data.records || []);
    } catch(e) { console.error('loadRefunds error:', e); }
  }

  async function requestRefund(product) {
    if (!user) { showToast('سجل الدخول أولاً', 'error'); return; }
    try {
      await fetch('/api/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request',
          productId: product.id,
          productName: product.fields.name,
          buyerUid: user.uid || user.username,
          buyerUsername: user.username,
          amountPi: product.fields.price_pi
        })
      });
      showToast('✅ تم إرسال طلب الاسترجاع!', 'success');
    } catch(e) {
      showToast('❌ فشل إرسال الطلب', 'error');
    }
  }

  // التعديل 3: تحسين معالجة الموافقة على الاسترجاع
  async function approveRefund(refund) {
    setRefundingId(refund.id);
    try {
      const res = await fetch('/api/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          refundId: refund.id,
          productName: refund.fields.product_name,
          buyerUid: refund.fields.buyer_uid,
          amountPi: refund.fields.amount_pi
        })
      });
      const data = await res.json();
      showToast('✅ تمت الموافقة!', 'success');
      await loadRefunds();
    } catch(e) {
      showToast('❌ فشل الاسترجاع', 'error');
    }
    setRefundingId(null);
  }

  function openSection(s) { setSection(s.key); setPage('section'); setSearch(''); }
  function goHome() { setPage('home'); setSection(null); setProducts([]); }

  async function buyWithPi(product) {
    if (!user) { showToast('سجل الدخول أولاً', 'error'); return; }
    if (paying) return;
    setPaying(product.id);
    const callbacks = {
      onReadyForServerApproval: async (paymentId) => {
        try {
          const res = await fetch('/api/payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'approve', paymentId }) });
          if (!res.ok) throw new Error();
        } catch(e) { showToast('خطأ في الموافقة', 'error'); setPaying(null); }
      },
      onReadyForServerCompletion: async (paymentId, txid) => {
        try {
          const res = await fetch('/api/payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'complete', paymentId, txid }) });
          if (!res.ok) throw new Error();
          window.Pi.completePayment(paymentId);
          showToast('✅ تمت عملية الشراء!', 'success'); setPaying(null);
        } catch(e) { showToast('❌ فشل إتمام الدفع', 'error'); setPaying(null); }
      },
      onCancel: () => { showToast('تم إلغاء الدفع', 'info'); setPaying(null); },
      onError: () => { showToast('خطأ في الدفع', 'error'); setPaying(null); }
    };
    try { window.Pi.createPayment({ amount: Number(product.fields.price_pi), memo: `شراء: ${product.fields.name}`, metadata: { productId: product.id, table: section } }, callbacks); }
    catch(e) { showToast('فشل إنشاء الدفع', 'error'); setPaying(null); }
  }

  async function submitProduct() {
    if (!form.name || !form.price_pi) { showToast('الاسم والسعر مطلوبان!', 'error'); return; }
    const fields = { name: form.name, price_pi: parseFloat(form.price_pi), description: form.description, image_url: form.image_url, brand: form.brand, status: form.status };
    if (section === 'Cars') fields.year = parseInt(form.year) || null;
    if (section === 'Real_Estate') { fields.location = form.location; fields.type = form.type; }
    if (['Electronics','Electric'].includes(section)) fields.condition = form.condition;
    try {
      const res = await fetch('/api/add-product', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ table: section, fields }) });
      if (res.ok) { showToast('✅ تم إضافة المنتج!', 'success'); setShowModal(false); loadProducts(section); }
      else showToast('❌ خطأ في الإضافة', 'error');
    } catch(e) { showToast('❌ خطأ في الاتصال', 'error'); }
  }

  const currentSection = sections.find(s => s.key === section);
  const filteredProducts = products.filter(r =>
    r.fields.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.fields.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Head>
        <title>Souq Pi - تسوق بعملة Pi</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
        <script src="https://sdk.minepi.com/pi-sdk.js"></script>
      </Head>

      <style>{`
        *{margin:0;padding:0;box-sizing:border-box;}
        body{background:#0a0a0f;color:#fff;font-family:'Cairo',sans-serif;min-height:100vh;}
        .navbar{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;background:rgba(10,10,15,0.95);backdrop-filter:blur(20px);position:sticky;top:0;z-index:100;border-bottom:1px solid rgba(255,255,255,0.06);}
        .navbar-brand{display:flex;align-items:center;gap:10px;cursor:pointer;}
        .navbar-logo{width:38px;height:38px;background:linear-gradient(135deg,#6c3fc8,#8b5cf6);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.2em;font-weight:900;}
        .navbar-title{font-size:1em;font-weight:800;color:#fff;}
        .navbar-sub{font-size:0.65em;color:#666;}
        .pi-price-bar{display:flex;align-items:center;gap:6px;background:rgba(108,63,200,0.15);border:1px solid rgba(108,63,200,0.3);border-radius:20px;padding:5px 12px;font-size:0.78em;font-weight:700;}
        .pi-price-dot{color:#00ff88;animation:pulse 1.5s infinite;font-size:0.6em;}
        .pi-price-val{color:#f0a500;}
        @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.3;}}
        .login-btn{background:linear-gradient(135deg,#6c3fc8,#8b5cf6);color:white;border:none;padding:9px 16px;border-radius:20px;cursor:pointer;font-family:'Cairo',sans-serif;font-size:0.82em;font-weight:700;}
        .user-chip{display:flex;align-items:center;gap:6px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);padding:7px 13px;border-radius:20px;cursor:pointer;}
        .user-name{font-size:0.82em;font-weight:700;color:#c084fc;}
        .hero{padding:24px 18px 32px;text-align:center;}
        .hero-badge{display:inline-block;background:rgba(108,63,200,0.2);border:1px solid rgba(108,63,200,0.35);color:#c084fc;padding:7px 18px;border-radius:20px;font-size:0.78em;font-weight:700;margin-bottom:20px;}
        .hero-title{font-size:2.2em;font-weight:900;line-height:1.2;margin-bottom:10px;}
        .hero-title span{color:#f0a500;}
        .hero-sub{color:#555;font-size:0.82em;margin-bottom:24px;}
        .featured-slider{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:20px;padding:28px 20px 20px;margin-bottom:28px;animation:fadeUp 0.5s ease;}
        .featured-icon{font-size:2.5em;display:block;margin-bottom:10px;}
        .featured-title{font-size:1.1em;font-weight:800;margin-bottom:6px;}
        .featured-sub{color:#555;font-size:0.8em;margin-bottom:14px;}
        .dots{display:flex;justify-content:center;gap:6px;}
        .dot{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,0.15);cursor:pointer;transition:all 0.3s;}
        .dot.on{background:#f0a500;width:18px;border-radius:3px;}
        .stats{display:flex;justify-content:center;gap:32px;margin-bottom:28px;}
        .stat-num{font-size:1.5em;font-weight:900;color:#f0a500;}
        .stat-lbl{font-size:0.7em;color:#555;}
        .calc-box{background:rgba(255,255,255,0.04);border:1px solid rgba(108,63,200,0.3);border-radius:18px;padding:18px;margin-bottom:24px;}
        .calc-title{color:#c084fc;font-size:0.85em;font-weight:700;margin-bottom:12px;}
        .calc-row{display:flex;align-items:center;gap:10px;}
        .calc-input-wrap{display:flex;align-items:center;background:rgba(255,255,255,0.06);border:1px solid rgba(108,63,200,0.3);border-radius:12px;padding:10px 14px;flex:1;}
        .calc-sym{color:#f0a500;font-weight:900;font-size:1.1em;margin-left:6px;}
        .calc-input{background:transparent;border:none;color:#fff;font-family:'Cairo',sans-serif;font-size:1em;font-weight:700;outline:none;width:100%;}
        .calc-eq{color:#555;font-size:1.1em;}
        .calc-result{background:rgba(255,255,255,0.06);border:1px solid rgba(108,63,200,0.3);border-radius:12px;padding:10px 14px;flex:1;color:#4ade80;font-weight:800;font-size:1em;text-align:center;}
        .sec-label{color:#444;font-size:0.78em;font-weight:600;letter-spacing:0.08em;margin-bottom:14px;}
        .categories{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
        .cat-card{border-radius:18px;padding:24px 16px 16px;cursor:pointer;transition:transform 0.2s;position:relative;overflow:hidden;border:1px solid rgba(255,255,255,0.06);}
        .cat-card:active{transform:scale(0.97);}
        .cat-icon{font-size:2em;display:block;margin-bottom:10px;}
        .cat-name{font-size:1em;font-weight:800;margin-bottom:4px;}
        .cat-count{font-size:0.72em;color:rgba(255,255,255,0.45);}
        .cat-arr{position:absolute;bottom:12px;left:14px;color:rgba(255,255,255,0.2);font-size:0.9em;}
        .section-page{padding:0 0 80px;}
        .sec-header{display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.06);}
        .back-btn{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);color:#fff;padding:8px 14px;border-radius:10px;cursor:pointer;font-family:'Cairo',sans-serif;font-size:0.82em;}
        .sec-title{flex:1;font-size:1em;font-weight:800;}
        .add-btn{background:linear-gradient(135deg,#6c3fc8,#8b5cf6);color:white;border:none;padding:8px 14px;border-radius:10px;cursor:pointer;font-family:'Cairo',sans-serif;font-size:0.82em;font-weight:700;}
        .srch-wrap{padding:14px 18px 8px;}
        .srch-input{width:100%;padding:11px 16px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:13px;color:#fff;font-family:'Cairo',sans-serif;font-size:0.88em;outline:none;}
        .products{padding:8px 18px;display:flex;flex-direction:column;gap:12px;}
        .pcard{display:flex;gap:14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:14px;animation:fadeUp 0.4s ease;}
        .pimg{width:90px;height:90px;object-fit:cover;border-radius:12px;flex-shrink:0;}
        .pph{width:90px;height:90px;background:rgba(255,255,255,0.04);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:2em;flex-shrink:0;}
        .pinfo{flex:1;min-width:0;}
        .pname{font-size:0.92em;font-weight:800;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .pprice{font-size:1em;font-weight:900;color:#f0a500;margin-bottom:2px;}
        .pdesc{font-size:0.75em;color:#555;margin-bottom:7px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
        .pst{font-size:0.72em;font-weight:700;margin-bottom:8px;}
        .av{color:#4ade80;} .sl{color:#f87171;}
        .buybtn{background:linear-gradient(135deg,#6c3fc8,#8b5cf6);color:white;border:none;padding:8px 14px;border-radius:10px;cursor:pointer;font-family:'Cairo',sans-serif;font-size:0.8em;font-weight:700;width:100%;margin-bottom:6px;}
        .buybtn:disabled{opacity:0.5;}
        .refundbtn{background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);color:#f87171;padding:7px 14px;border-radius:10px;cursor:pointer;font-family:'Cairo',sans-serif;font-size:0.75em;font-weight:700;width:100%;}
        .ldg{display:flex;flex-direction:column;align-items:center;gap:12px;padding:40px;}
        .ldg-spin{width:32px;height:32px;border:3px solid rgba(108,63,200,0.2);border-top-color:#8b5cf6;border-radius:50%;animation:spin 0.8s linear infinite;}
        .emp{text-align:center;padding:40px;color:#444;}
        .emp-ic{font-size:2.5em;margin-bottom:10px;}

        .refund-panel{padding:16px 18px;border-top:1px solid rgba(255,255,255,0.06);margin-top:8px;}
        .refund-panel-title{font-size:0.9em;font-weight:800;color:#f0a500;margin-bottom:12px;}
        .refund-card{background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:14px;padding:14px;margin-bottom:10px;}
        .refund-info{font-size:0.8em;color:#aaa;margin-bottom:8px;}
        .refund-info span{color:#fff;font-weight:700;}
        .approve-btn{background:linear-gradient(135deg,#22c55e,#16a34a);color:white;border:none;padding:8px 16px;border-radius:10px;cursor:pointer;font-family:'Cairo',sans-serif;font-size:0.8em;font-weight:700;}
        .approve-btn:disabled{opacity:0.5;}

        .mbg{position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:200;display:flex;align-items:flex-end;justify-content:center;backdrop-filter:blur(8px);}
        .mbox{background:#111118;border:1px solid rgba(255,255,255,0.08);border-radius:24px 24px 0 0;padding:24px;width:100%;max-width:500px;max-height:90vh;overflow-y:auto;animation:slideUp 0.3s ease;}
        .mhandle{width:36px;height:4px;background:rgba(255,255,255,0.15);border-radius:2px;margin:0 auto 18px;}
        .mbox h3{color:#fff;margin-bottom:18px;font-size:1.05em;font-weight:800;}
        .fg{margin-bottom:13px;}
        .fg label{display:block;color:#666;margin-bottom:5px;font-size:0.78em;font-weight:600;letter-spacing:0.05em;}
        .fg input,.fg select{width:100%;padding:11px 14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:11px;color:#fff;font-family:'Cairo',sans-serif;font-size:0.88em;outline:none;transition:all 0.2s;}
        .faction{display:flex;gap:10px;margin-top:18px;}
        .bsave{flex:1;background:linear-gradient(135deg,#6c3fc8,#8b5cf6);color:white;border:none;padding:13px;border-radius:13px;cursor:pointer;font-family:'Cairo',sans-serif;font-size:0.92em;font-weight:700;}
        .bcanc{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);color:#666;padding:13px 18px;border-radius:13px;cursor:pointer;}
        .toast{position:fixed;bottom:28px;left:50%;transform:translateX(-50%);padding:11px 22px;border-radius:50px;z-index:9999;font-size:0.82em;font-weight:600;white-space:nowrap;backdrop-filter:blur(20px);animation:toastIn 0.3s ease;}
        .ts{background:rgba(34,197,94,0.2);border:1px solid rgba(34,197,94,0.35);color:#4ade80;}
        .te{background:rgba(239,68,68,0.2);border:1px solid rgba(239,68,68,0.35);color:#f87171;}
        .ti{background:rgba(108,63,200,0.2);border:1px solid rgba(108,63,200,0.35);color:#c084fc;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(25px);}to{opacity:1;transform:translateY(0);}}
        @keyframes spin{to{transform:rotate(360deg);}}
        @keyframes slideUp{from{transform:translateY(100%);}to{transform:translateY(0);}}
        @keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(15px);}to{opacity:1;transform:translateX(-50%) translateY(0);}}
      `}</style>

      <nav className="navbar">
        <div className="navbar-brand" onClick={goHome}>
          <div className="navbar-logo">π</div>
          <div><div className="navbar-title">Souq Pi</div><div className="navbar-sub">تسوق بعملة Pi</div></div>
        </div>
        <div className="pi-price-bar">
          <span className="pi-price-dot">●</span>
          <span className="pi-price-val">π = {piPrice ? `$${piPrice.toFixed(4)}` : '...'}</span>
        </div>
        {user ? (
          <div className="user-chip" onClick={() => isAdmin && setShowRefunds(!showRefunds)}>
            <span style={{fontSize:'1.1em'}}>👤</span>
            <span className="user-name">{user.username}</span>
            {isAdmin && <span style={{color:'#f0a500'}}>⭐</span>}
            {isAdmin && refunds.length > 0 && <span style={{background:'#ef4444',borderRadius:'50%',width:'18px',height:'18px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.7em',fontWeight:'900'}}>{refunds.length}</span>}
          </div>
        ) : (
          <button className="login-btn" onClick={loginWithPi}>دخول π</button>
        )}
      </nav>

      {isAdmin && showRefunds && (
        <div className="refund-panel">
          <div className="refund-panel-title">🔄 طلبات الاسترجاع ({refunds.length})</div>
          {refunds.length === 0 && <div style={{color:'#555',fontSize:'0.82em'}}>لا توجد طلبات معلقة</div>}
          {refunds.map(r => (
            <div key={r.id} className="refund-card">
              <div className="refund-info">المنتج: <span>{r.fields.product_name}</span></div>
              <div className="refund-info">الزبون: <span>{r.fields.buyer_username}</span></div>
              <div className="refund-info">المبلغ: <span>π {r.fields.amount_pi}</span></div>
              <button className="approve-btn" onClick={() => approveRefund(r)} disabled={refundingId === r.id}>
                {refundingId === r.id ? '⏳ جاري...' : '✅ موافقة وإرسال Pi'}
              </button>
            </div>
          ))}
        </div>
      )}

      {page === 'home' && (
        <div className="hero">
          <div className="hero-badge">🌟 المتجر الأول على Pi Network</div>
          <h1 className="hero-title">تسوق وبع<br/><span>بعملة Pi</span></h1>
          <p className="hero-sub">آلاف المنتجات • دفع آمن • موثوق</p>
          <div className="featured-slider">
            <span className="featured-icon">{FEATURED[featuredIdx].icon}</span>
            <div className="featured-title">{FEATURED[featuredIdx].title}</div>
            <div className="featured-sub">{FEATURED[featuredIdx].sub}</div>
            <div className="dots">
              {FEATURED.map((_,i) => <div key={i} className={`dot ${i===featuredIdx?'on':''}`} onClick={()=>setFeaturedIdx(i)} />)}
            </div>
          </div>
          <div className="stats">
            <div><div className="stat-num">86+</div><div className="stat-lbl">منتج</div></div>
            <div><div className="stat-num">4</div><div className="stat-lbl">فئة</div></div>
            <div><div className="stat-num">π</div><div className="stat-lbl">دفع آمن</div></div>
          </div>
          <div className="calc-box">
            <div className="calc-title">💱 حاسبة Pi اللحظية</div>
            <div className="calc-row">
              <div className="calc-input-wrap">
                <span className="calc-sym">π</span>
                <input className="calc-input" type="number" value={calcPi} onChange={e => setCalcPi(e.target.value)} placeholder="0" />
              </div>
              <span className="calc-eq">=</span>
              <div className="calc-result">$ {calcPi && piPrice ? (calcPi * piPrice).toFixed(2) : '0.00'}</div>
            </div>
          </div>
          <div className="sec-label">تصفح الفئات</div>
          <div className="categories">
            {sections.map(s => (
              <div key={s.key} className="cat-card" style={{background:s.gradient}} onClick={()=>openSection(s)}>
                <span className="cat-icon">{s.icon}</span>
                <div className="cat-name">{s.ar}</div>
                <div className="cat-count">{s.count}</div>
                <div className="cat-arr">←</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {page === 'section' && currentSection && (
        <div className="section-page">
          <div className="sec-header">
            <button className="back-btn" onClick={goHome}>← رجوع</button>
            <div className="sec-title">{currentSection.icon} {currentSection.ar}</div>
            {isAdmin && <button className="add-btn" onClick={()=>setShowModal(true)}>+ إضافة</button>}
          </div>
          <div className="srch-wrap">
            <input className="srch-input" placeholder={`ابحث في ${currentSection.ar}...`} value={search} onChange={e=>setSearch(e.target.value)} />
          </div>
          <div className="products">
            {loading && <div className="ldg"><div className="ldg-spin"/><div style={{color:'#444'}}>جاري التحميل...</div></div>}
            {!loading && filteredProducts.length===0 && <div className="emp"><div className="emp-ic">📦</div><div>لا توجد منتجات</div></div>}
            {filteredProducts.map(r => {
              const imgUrl = r.fields.image_url || (r.fields.Image&&r.fields.Image[0]?r.fields.Image[0].url:null);
              return (
                <div key={r.id} className="pcard">
                  {imgUrl ? <img className="pimg" src={imgUrl} alt={r.fields.name} onError={e=>e.target.style.display='none'}/> : <div className="pph">{currentSection.icon}</div>}
                  <div className="pinfo">
                    <div className="pname">{r.fields.name}</div>
                    <div className="pprice">π {(r.fields.price_pi / CONSENSUS_PRICE).toFixed(4)}</div>
                    <div className="pdesc">{r.fields.description}</div>
                    <div className={`pst ${r.fields.status==='Sold'?'sl':'av'}`}>{r.fields.status==='Sold'?'● مباع':'● متاح'}</div>
                    {r.fields.status!=='Sold' && (
                      <button className="buybtn" onClick={()=>buyWithPi(r)} disabled={paying===r.id}>
                        {paying===r.id?'⏳ جاري...':'🛒 اشتري بـ Pi'}
                      </button>
                    )}
                    {user && !isAdmin && (
                      <button className="refundbtn" onClick={()=>requestRefund(r)}>
                        🔄 طلب استرجاع
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showModal && (
        <div className="mbg" onClick={()=>setShowModal(false)}>
          <div className="mbox" onClick={e=>e.stopPropagation()}>
            <div className="mhandle"/>
            <h3>➕ إضافة منتج جديد</h3>
            {['name','price_pi','description','image_url','brand'].map(f=>(
              <div key={f} className="fg">
                <label>{f==='name'?'الاسم *':f==='price_pi'?'السعر Pi *':f==='description'?'الوصف':f==='image_url'?'رابط الصورة':'الماركة'}</label>
                <input type={f==='price_pi'?'number':'text'} value={form[f]} onChange={e=>setForm({...form,[f]:e.target.value})} />
              </div>
            ))}
            {section==='Cars' && <div className="fg"><label>سنة الصنع</label><input type="number" value={form.year} onChange={e=>setForm({...form,year:e.target.value})}/></div>}
            {section==='Real_Estate' && <>
              <div className="fg"><label>الموقع</label><input type="text" value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/></div>
              <div className="fg"><label>النوع</label><select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option value="Villa">فيلا</option><option value="Apartment">شقة</option><option value="Land">أرض</option></select></div>
            </>}
            {['Electronics','Electric'].includes(section) && <div className="fg"><label>الحالة</label><select value={form.condition} onChange={e=>setForm({...form,condition:e.target.value})}><option value="New">جديد</option><option value="Used">مستعمل</option></select></div>}
            <div className="fg"><label>حالة الإتاحة</label><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="Available">متاح</option><option value="Sold">مباع</option></select></div>
            <div className="faction">
              <button className="bsave" onClick={submitProduct}>حفظ المنتج ✅</button>
              <button className="bcanc" onClick={()=>setShowModal(false)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast ${toastType==='success'?'ts':toastType==='error'?'te':'ti'}`}>{toast}</div>}
    </>
  );
}
