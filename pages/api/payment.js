import { useState, useEffect } from 'react';
import Head from 'next/head';

const ADMIN = 'alhawawsheh1524';
const CONSENSUS_PRICE = 314159;

const sections = [
  { key: 'Cars', ar: 'سيارات', en: 'Cars', icon: '🚗' },
  { key: 'Electric', ar: 'كهربائيات', en: 'Electric', icon: '⚡' },
  { key: 'Electronics', ar: 'إلكترونيات', en: 'Electronics', icon: '📱' },
  { key: 'Real_Estate', ar: 'عقارات', en: 'Real Estate', icon: '🏠' },
];

export default function Home() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('home');
  const [section, setSection] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState('');
  const [paying, setPaying] = useState(null);
  const [form, setForm] = useState({ name:'', price_pi:'', description:'', image_url:'', brand:'', year:'', location:'', type:'Villa', condition:'New', status:'Available' });

  const isAdmin = user && user.username === ADMIN;

  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof window !== 'undefined' && window.Pi) {
        window.Pi.init({ version: "2.0", sandbox: false });
        clearInterval(interval);
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (section) loadProducts(section);
  }, [section]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  }

  async function loginWithPi() {
    if (!window.Pi) { showToast('افتح التطبيق داخل Pi Browser'); return; }
    try {
      const auth = await window.Pi.authenticate(['username', 'payments']);
      if (auth && auth.user) { setUser(auth.user); showToast('مرحباً ' + auth.user.username + ' 👋'); }
    } catch (e) { showToast('فشل تسجيل الدخول'); }
  }

  async function loadProducts(table) {
    setLoading(true);
    setProducts([]);
    try {
      const res = await fetch(`/api/products?table=${table}`);
      const data = await res.json();
      setProducts(data.records || []);
    } catch(e) { showToast('خطأ في التحميل'); }
    setLoading(false);
  }

  function openSection(s) { setSection(s.key); setPage('section'); }
  function goHome() { setPage('home'); setSection(null); setProducts([]); }

  async function buyWithPi(product) {
    if (!user) { showToast('سجل الدخول أولاً'); return; }
    if (paying) return;
    setPaying(product.id);
    const payment = {
      amount: Number(product.fields.price_pi),
      memo: `شراء: ${product.fields.name}`,
      metadata: { productId: product.id, table: section }
    };
    const callbacks = {
      onReadyForServerApproval: async (paymentId) => {
        try {
          const res = await fetch('/api/payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'approve', paymentId }) });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Approve failed');
        } catch (e) { showToast('خطأ في موافقة الخادم'); setPaying(null); }
      },
      onReadyForServerCompletion: async (paymentId, txid) => {
        try {
          const res = await fetch('/api/payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'complete', paymentId, txid }) });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Completion failed');
          showToast('✅ تمت عملية الشراء بنجاح'); setPaying(null);
        } catch (e) { showToast('❌ فشل إتمام الدفع'); setPaying(null); }
      },
      onCancel: () => { showToast('تم إلغاء الدفع'); setPaying(null); },
      onError: (err) => { showToast('خطأ: ' + err.message); setPaying(null); }
    };
    try {
      await window.Pi.createPayment(payment, callbacks);
    } catch (e) { showToast('فشل إنشاء الدفع'); setPaying(null); }
  }

  async function submitProduct() {
    if (!form.name || !form.price_pi) { showToast('الاسم والسعر مطلوبان!'); return; }
    const fields = { name: form.name, price_pi: parseFloat(form.price_pi), description: form.description, image_url: form.image_url, brand: form.brand, status: form.status };
    if (section === 'Cars') fields.year = parseInt(form.year) || null;
    if (section === 'Real_Estate') { fields.location = form.location; fields.type = form.type; }
    if (['Electronics','Electric'].includes(section)) fields.condition = form.condition;
    try {
      const res = await fetch('/api/add-product', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ table: section, fields }) });
      if (res.ok) { showToast('✅ تم إضافة المنتج!'); setShowModal(false); loadProducts(section); }
      else showToast('❌ خطأ في الإضافة');
    } catch(e) { showToast('❌ خطأ في الاتصال'); }
  }

  const currentSection = sections.find(s => s.key === section);

  return (
    <>
      <Head><script src="https://sdk.minepi.com/pi-sdk.js" /></Head>
      <style>{`
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; background:#f5f0ff; direction:rtl; }
        .navbar { background:#4a2a8a; color:white; padding:15px 20px; display:flex; justify-content:space-between; align-items:center; }
        .navbar h1 { font-size:1.3em; }
        .pi-logo { color:#f0a500; font-size:1.8em; margin-left:8px; }
        .login-btn { background:#f0a500; color:#333; border:none; padding:8px 18px; border-radius:20px; cursor:pointer; font-weight:bold; }
        .hero { background:linear-gradient(135deg,#4a2a8a,#6c3fc8); color:white; text-align:center; padding:50px 20px; }
        .hero h2 { font-size:1.8em; margin-bottom:10px; }
        .categories { display:grid; grid-template-columns:repeat(2,1fr); gap:20px; padding:30px 20px; max-width:800px; margin:0 auto; }
        .cat-card { background:white; border-radius:20px; padding:40px 20px; text-align:center; cursor:pointer; box-shadow:0 4px 15px rgba(108,63,200,0.15); transition:transform 0.2s; }
        .cat-card:hover { transform:translateY(-5px); }
        .cat-card .icon { font-size:3em; margin-bottom:15px; }
        .cat-card h3 { color:#4a2a8a; font-size:1.2em; }
        .cat-card p { color:#888; font-size:0.85em; }
        .section-header { display:flex; align-items:center; gap:15px; padding:15px 20px; background:white; box-shadow:0 2px 8px rgba(0,0,0,0.08); }
        .back-btn { background:#6c3fc8; color:white; border:none; padding:8px 15px; border-radius:10px; cursor:pointer; }
        .section-header h2 { flex:1; color:#4a2a8a; }
        .add-btn { background:#f0a500; color:#333; border:none; padding:10px 20px; border-radius:10px; cursor:pointer; font-weight:bold; }
        .products { display:grid; grid-template-columns:repeat(auto-fill,minmax(250px,1fr)); gap:20px; padding:20px; }
        .prod-card { background:white; border-radius:15px; overflow:hidden; box-shadow:0 3px 12px rgba(0,0,0,0.08); }
        .prod-img { width:100%; height:180px; object-fit:cover; }
        .prod-placeholder { width:100%; height:180px; background:#e8d9ff; display:flex; align-items:center; justify-content:center; font-size:3em; }
        .prod-info { padding:15px; }
        .prod-info h4 { color:#4a2a8a; margin-bottom:5px; }
        .price { color:#f0a500; font-weight:bold; font-size:1.1em; margin-bottom:4px; }
        .consensus { color:#888; font-size:0.75em; margin-bottom:8px; background:#f5f0ff; padding:3px 8px; border-radius:8px; display:inline-block; }
        .prod-info p { color:#666; font-size:0.85em; margin-bottom:8px; }
        .status { display:inline-block; padding:3px 10px; border-radius:10px; font-size:0.8em; font-weight:bold; margin-bottom:10px; }
        .available { background:#d4edda; color:#155724; }
        .sold { background:#f8d7da; color:#721c24; }
        .buy-btn { width:100%; background:#6c3fc8; color:white; border:none; padding:10px; border-radius:10px; cursor:pointer; font-size:0.95em; font-weight:bold; margin-top:8px; }
        .buy-btn:disabled { background:#ccc; cursor:not-allowed; }
        .loading { text-align:center; padding:50px; color:#6c3fc8; }
        .empty { text-align:center; padding:50px; color:#999; }
        .modal-bg { position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:1000; display:flex; align-items:center; justify-content:center; }
        .modal { background:white; border-radius:20px; padding:25px; width:90%; max-width:500px; max-height:85vh; overflow-y:auto; }
        .modal h3 { color:#4a2a8a; margin-bottom:20px; }
        .form-group { margin-bottom:15px; }
        .form-group label { display:block; color:#4a2a8a; margin-bottom:5px; font-weight:bold; font-size:0.9em; }
        .form-group input, .form-group select { width:100%; padding:10px; border:2px solid #e8d9ff; border-radius:10px; font-size:0.95em; }
        .form-actions { display:flex; gap:10px; margin-top:15px; }
        .btn-save { background:#6c3fc8; color:white; border:none; padding:12px; border-radius:10px; cursor:pointer; flex:1; font-size:1em; }
        .btn-cancel { background:#eee; border:none; padding:12px; border-radius:10px; cursor:pointer; }
        .toast { position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:#4a2a8a; color:white; padding:12px 25px; border-radius:25px; z-index:9999; max-width:90%; text-align:center; }
        .user-info { display:flex; align-items:center; gap:8px; color:white; font-size:0.9em; }
        .admin-badge { color:#f0a500; font-size:0.8em; }
      `}</style>

      <nav className="navbar">
        <div style={{display:'flex',alignItems:'center'}}>
          <span className="pi-logo">π</span>
          <h1>Souq Pi</h1>
        </div>
        {user ? (
          <div className="user-info">
            <span>👤 {user.username}</span>
            {isAdmin && <span className="admin-badge">⭐ مدير</span>}
          </div>
        ) : (
          <button className="login-btn" onClick={loginWithPi}>تسجيل دخول</button>
        )}
      </nav>

      {page === 'home' && (
        <>
          <div className="hero">
            <h2>🛍️ سوق باي | Souq Pi</h2>
            <p>تسوق وبع بعملة Pi</p>
          </div>
          <div className="categories">
            {sections.map(s => (
              <div key={s.key} className="cat-card" onClick={() => openSection(s)}>
                <div className="icon">{s.icon}</div>
                <h3>{s.ar}</h3>
                <p>{s.en}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {page === 'section' && currentSection && (
        <>
          <div className="section-header">
            <button className="back-btn" onClick={goHome}>→ رجوع</button>
            <h2>{currentSection.icon} {currentSection.ar}</h2>
            {isAdmin && <button className="add-btn" onClick={() => setShowModal(true)}>+ إضافة</button>}
          </div>
          <div className="products">
            {loading && <div className="loading">⏳ جاري التحميل...</div>}
            {!loading && products.length === 0 && <div className="empty">📦 لا توجد منتجات بعد</div>}
            {products.map(r => (
              <div key={r.id} className="prod-card">
                {r.fields.image_url ? <img className="prod-img" src={r.fields.image_url} alt={r.fields.name} onError={e => e.target.style.display='none'} /> : <div className="prod-placeholder">{currentSection.icon}</div>}
                <div className="prod-info">
                  <h4>{r.fields.name}</h4>
                  <div className="price">π {r.fields.price_pi}</div>
                  <div className="consensus">💰 سعر الإجماع: ${CONSENSUS_PRICE.toLocaleString()} / Pi</div>
                  <p>{r.fields.description}</p>
                  <span className={`status ${r.fields.status === 'Sold' ? 'sold' : 'available'}`}>{r.fields.status === 'Sold' ? 'مباع' : 'متاح'}</span>
                  {r.fields.status !== 'Sold' && (
                    <button className="buy-btn" onClick={() => buyWithPi(r)} disabled={paying === r.id}>
                      {paying === r.id ? '⏳ جاري الدفع...' : '🛒 اشتري بـ Pi'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showModal && (
        <div className="modal-bg" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>➕ إضافة منتج</h3>
            {['name','price_pi','description','image_url','brand'].map(f => (
              <div key={f} className="form-group">
                <label>{f === 'name' ? 'الاسم *' : f === 'price_pi' ? 'السعر Pi *' : f === 'description' ? 'الوصف' : f === 'image_url' ? 'رابط الصورة' : 'الماركة'}</label>
                <input type={f === 'price_pi' ? 'number' : 'text'} value={form[f]} onChange={e => setForm({...form, [f]: e.target.value})} />
              </div>
            ))}
            {section === 'Cars' && <div className="form-group"><label>السنة</label><input type="number" value={form.year} onChange={e => setForm({...form, year: e.target.value})} /></div>}
            {section === 'Real_Estate' && <>
              <div className="form-group"><label>الموقع</label><input type="text" value={form.location} onChange={e => setForm({...form, location: e.target.value})} /></div>
              <div className="form-group"><label>النوع</label><select value={form.type} onChange={e => setForm({...form, type: e.target.value})}><option value="Villa">فيلا</option><option value="Apartment">شقة</option><option value="Land">أرض</option></select></div>
            </>}
            {['Electronics','Electric'].includes(section) && <div className="form-group"><label>الحالة</label><select value={form.condition} onChange={e => setForm({...form, condition: e.target.value})}><option value="New">جديد</option><option value="Used">مستعمل</option></select></div>}
            <div className="form-group"><label>الحالة</label><select value={form.status} onChange={e => setForm({...form, status: e.target.value})}><option value="Available">متاح</option><option value="Sold">مباع</option></select></div>
            <div className="form-actions">
              <button className="btn-save" onClick={submitProduct}>حفظ ✅</button>
              <button className="btn-cancel" onClick={() => setShowModal(false)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
