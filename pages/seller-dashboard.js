// pages/seller-dashboard.js
import { useState, useEffect } from 'react';
import Head from 'next/head';

const TABLES = [
  { key: 'Cars', ar: 'سيارات', icon: '🚗' },
  { key: 'Electronics', ar: 'إلكترونيات', icon: '📱' },
  { key: 'Electric', ar: 'كهربائيات', icon: '⚡' },
  { key: 'Real_Estate', ar: 'عقارات', icon: '🏠' },
];

export default function SellerDashboard() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addTable, setAddTable] = useState('Electronics');
  const [addForm, setAddForm] = useState({ name: '', price_pi: '', description: '', image_url: '' });
  const [adding, setAdding] = useState(false);
  const [isSeller, setIsSeller] = useState(false);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
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
      await checkSeller(auth.user.username);
    } catch(e) { showToast('فشل تسجيل الدخول'); }
  }

  async function checkSeller(username) {
    setLoading(true);
    try {
      const res = await fetch(`/api/seller-request?username=${username}`);
      const data = await res.json();
      if (data.isSeller) {
        setIsSeller(true);
        await loadProducts(username);
        await loadOrders(username);
      } else {
        setIsSeller(false);
      }
    } catch(e) {}
    setLoading(false);
  }

  async function loadProducts(username) {
    try {
      const res = await fetch(`/api/seller-products?username=${username}`);
      const data = await res.json();
      setProducts(data.records || []);
    } catch(e) { showToast('خطأ في تحميل المنتجات'); }
  }

  async function loadOrders(username) {
    try {
      // جلب كل الطلبات من Orders وفلتر اللي فيها منتجات هذا التاجر
      const res = await fetch(`/api/seller-orders?seller_username=${username}`);
      const data = await res.json();
      setOrders(data.records || []);
    } catch(e) {}
  }

  async function deleteProduct(product) {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
    setDeleting(product.id);
    try {
      const res = await fetch('/api/seller-products', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: user.username,
          recordId: product.id,
          table: product._table
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('✅ تم حذف المنتج');
        setProducts(prev => prev.filter(p => p.id !== product.id));
      } else {
        showToast(data.error || '❌ فشل الحذف');
      }
    } catch(e) { showToast('❌ خطأ في الحذف'); }
    setDeleting(null);
  }

  async function addProduct() {
    if (!addForm.name.trim() || !addForm.price_pi) {
      showToast('أدخل اسم المنتج والسعر');
      return;
    }
    setAdding(true);
    try {
      const res = await fetch('/api/add-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: user.username,
          table: addTable,
          fields: {
            name: addForm.name.trim(),
            price_pi: Number(addForm.price_pi),
            description: addForm.description.trim(),
            image_url: addForm.image_url.trim(),
            seller_username: user.username
          }
        })
      });
      const data = await res.json();
      if (data.id) {
        showToast('✅ تم إضافة المنتج بنجاح!');
        setAddForm({ name: '', price_pi: '', description: '', image_url: '' });
        setShowAddForm(false);
        await loadProducts(user.username);
      } else {
        showToast(data.error || '❌ فشل الإضافة');
      }
    } catch(e) { showToast('❌ خطأ في الإضافة'); }
    setAdding(false);
  }

  const totalSales = orders.reduce((sum, o) => sum + (Number(o.fields?.amount_pi) || 0), 0);

  return (
    <>
      <Head>
        <title>لوحة التاجر - Souq Pi</title>
        <script src="https://sdk.minepi.com/pi-sdk.js"></script>
        <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#0a0118;color:#fff;font-family:'Cairo',sans-serif;direction:rtl;min-height:100vh;padding-bottom:100px;}
        .header{background:rgba(26,11,46,0.95);padding:14px 20px;border-bottom:1px solid #d4af37;display:flex;align-items:center;gap:10px;position:sticky;top:0;z-index:100;}
        .badge{background:linear-gradient(135deg,#6a0dad,#d4af37);border-radius:50%;width:38px;height:38px;display:flex;align-items:center;justify-content:center;font-size:1.1em;flex-shrink:0;}
        .back-btn{background:rgba(255,255,255,0.08);border:none;color:#fff;padding:8px 14px;border-radius:10px;cursor:pointer;font-family:'Cairo',sans-serif;font-size:0.85em;}
        .container{max-width:480px;margin:0 auto;padding:16px;}
        .login-box{text-align:center;padding:60px 20px;}
        .btn-login{background:linear-gradient(135deg,#6a0dad,#d4af37);color:white;border:none;padding:14px 30px;border-radius:14px;font-weight:900;cursor:pointer;font-size:1em;font-family:'Cairo',sans-serif;margin-top:20px;}
        .stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px;}
        .stat{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:14px 8px;text-align:center;}
        .stat-num{font-size:1.6em;font-weight:900;}
        .stat-label{font-size:0.68em;color:#b0b0b0;margin-top:2px;}
        .tabs{display:flex;gap:8px;margin-bottom:16px;}
        .tab{flex:1;padding:10px;border-radius:12px;border:1px solid #331a5e;background:none;color:#b0b0b0;font-family:'Cairo',sans-serif;font-size:0.82em;font-weight:700;cursor:pointer;}
        .tab.active{background:linear-gradient(135deg,#6a0dad,#d4af37);color:#fff;border-color:transparent;}
        .btn-add{background:linear-gradient(135deg,#6a0dad,#d4af37);color:#fff;border:none;padding:12px;border-radius:14px;width:100%;font-weight:900;cursor:pointer;font-family:'Cairo',sans-serif;font-size:0.95em;margin-bottom:16px;}
        .product-card{background:#1a0b2e;border:1px solid #331a5e;border-radius:16px;padding:14px;margin-bottom:10px;display:flex;gap:12px;align-items:center;}
        .product-img{width:60px;height:60px;border-radius:10px;object-fit:cover;flex-shrink:0;}
        .product-info{flex:1;}
        .product-name{font-weight:800;font-size:0.9em;}
        .product-price{color:#d4af37;font-weight:900;font-size:0.85em;margin-top:3px;}
        .product-table{display:inline-block;background:rgba(106,13,173,0.3);border:1px solid #6a0dad;border-radius:6px;padding:1px 8px;font-size:0.68em;color:#c084fc;margin-top:4px;}
        .btn-delete{background:rgba(239,68,68,0.1);border:1px solid #ef4444;color:#ef4444;padding:8px 12px;border-radius:10px;cursor:pointer;font-family:'Cairo',sans-serif;font-size:0.78em;font-weight:700;flex-shrink:0;}
        .btn-delete:disabled{opacity:0.5;}
        .order-card{background:#1a0b2e;border:1px solid #331a5e;border-radius:16px;padding:14px;margin-bottom:10px;}
        .order-name{font-weight:800;font-size:0.9em;}
        .order-buyer{font-size:0.75em;color:#b0b0b0;margin-top:3px;}
        .order-price{color:#4ade80;font-weight:900;font-size:0.85em;margin-top:3px;}
        .order-date{font-size:0.68em;color:#6a0dad;margin-top:3px;}
        .add-form{background:#1a0b2e;border:1px solid #331a5e;border-radius:20px;padding:20px;margin-bottom:16px;}
        .form-label{font-size:0.82em;color:#d4af37;font-weight:700;margin-bottom:6px;}
        .form-input{width:100%;background:#0a0118;border:1px solid #6a0dad;padding:12px;border-radius:12px;color:#fff;font-family:'Cairo',sans-serif;font-size:0.9em;margin-bottom:12px;outline:none;}
        .form-select{width:100%;background:#0a0118;border:1px solid #6a0dad;padding:12px;border-radius:12px;color:#fff;font-family:'Cairo',sans-serif;font-size:0.9em;margin-bottom:12px;outline:none;}
        .btn-submit{background:linear-gradient(135deg,#16a34a,#22c55e);color:#fff;border:none;padding:12px;border-radius:12px;width:100%;font-weight:900;cursor:pointer;font-family:'Cairo',sans-serif;font-size:0.95em;}
        .btn-cancel{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#b0b0b0;padding:10px;border-radius:12px;width:100%;font-weight:700;cursor:pointer;font-family:'Cairo',sans-serif;font-size:0.85em;margin-top:8px;}
        .empty{text-align:center;padding:40px 20px;color:#b0b0b0;font-size:0.85em;}
        .not-seller{text-align:center;padding:40px 20px;}
        .toast{position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:#6a0dad;padding:10px 20px;border-radius:20px;font-size:0.85em;z-index:2000;max-width:90%;text-align:center;}
        .bottom-nav{position:fixed;bottom:0;left:0;right:0;background:#1a0b2e;display:flex;justify-content:space-around;padding:12px;border-top:1px solid #6a0dad;z-index:1000;}
        .nav-item{text-align:center;font-size:0.7em;cursor:pointer;color:#b0b0b0;flex:1;}
        .nav-item.active{color:#d4af37;}
      `}</style>

      <div className="header">
        <button className="back-btn" onClick={() => window.location.href = '/'}>← رجوع</button>
        <div className="badge">🏪</div>
        <div>
          <div style={{fontWeight:900, fontSize:'0.9em'}}>لوحة التاجر</div>
          <div style={{fontSize:'0.65em', color:'#d4af37'}}>Souq Pi Mainnet</div>
        </div>
      </div>

      <div className="container">
        {!user && (
          <div className="login-box">
            <div style={{fontSize:'3em'}}>🏪</div>
            <div style={{fontWeight:800, fontSize:'1.1em', margin:'12px 0 8px'}}>لوحة التاجر</div>
            <div style={{fontSize:'0.85em', color:'#b0b0b0'}}>سجّل الدخول لإدارة متجرك</div>
            <button className="btn-login" onClick={loginWithPi}>🔑 دخول بـ Pi</button>
          </div>
        )}

        {user && loading && (
          <div style={{textAlign:'center', padding:40, color:'#b0b0b0'}}>جاري التحقق...</div>
        )}

        {user && !loading && !isSeller && (
          <div className="not-seller">
            <div style={{fontSize:'3em', marginBottom:12}}>⛔</div>
            <div style={{fontWeight:800, fontSize:'1.1em', marginBottom:8}}>غير مصرح</div>
            <div style={{fontSize:'0.85em', color:'#b0b0b0', marginBottom:20}}>أنت لست تاجراً معتمداً بعد</div>
            <button
              onClick={() => window.location.href = '/become-seller'}
              style={{background:'linear-gradient(135deg,#6a0dad,#d4af37)',border:'none',color:'white',padding:'12px 24px',borderRadius:'14px',fontWeight:900,cursor:'pointer',fontFamily:'Cairo',fontSize:'0.95em'}}
            >
              🚀 انضم كتاجر
            </button>
          </div>
        )}

        {user && !loading && isSeller && (
          <>
            {/* إحصائيات */}
            <div className="stats">
              <div className="stat">
                <div className="stat-num" style={{color:'#d4af37'}}>{products.length}</div>
                <div className="stat-label">منتجاتي</div>
              </div>
              <div className="stat">
                <div className="stat-num" style={{color:'#4ade80'}}>{orders.length}</div>
                <div className="stat-label">الطلبات</div>
              </div>
              <div className="stat">
                <div className="stat-num" style={{color:'#c084fc'}}>π {totalSales.toFixed(2)}</div>
                <div className="stat-label">المبيعات</div>
              </div>
            </div>

            {/* تابات */}
            <div className="tabs">
              <button className={`tab ${tab === 'products' ? 'active' : ''}`} onClick={() => setTab('products')}>
                📦 منتجاتي ({products.length})
              </button>
              <button className={`tab ${tab === 'orders' ? 'active' : ''}`} onClick={() => setTab('orders')}>
                🛍️ الطلبات ({orders.length})
              </button>
            </div>

            {/* تاب المنتجات */}
            {tab === 'products' && (
              <>
                <button className="btn-add" onClick={() => setShowAddForm(!showAddForm)}>
                  {showAddForm ? '✕ إلغاء' : '➕ إضافة منتج جديد'}
                </button>

                {showAddForm && (
                  <div className="add-form">
                    <div className="form-label">القسم</div>
                    <select className="form-select" value={addTable} onChange={e => setAddTable(e.target.value)}>
                      {TABLES.map(t => (
                        <option key={t.key} value={t.key}>{t.icon} {t.ar}</option>
                      ))}
                    </select>

                    <div className="form-label">اسم المنتج *</div>
                    <input className="form-input" placeholder="مثال: آيفون 15 Pro" value={addForm.name} onChange={e => setAddForm({...addForm, name: e.target.value})} />

                    <div className="form-label">السعر بـ Pi *</div>
                    <input className="form-input" type="number" placeholder="0.00" value={addForm.price_pi} onChange={e => setAddForm({...addForm, price_pi: e.target.value})} />

                    <div className="form-label">وصف المنتج</div>
                    <input className="form-input" placeholder="وصف مختصر..." value={addForm.description} onChange={e => setAddForm({...addForm, description: e.target.value})} />

                    <div className="form-label">رابط الصورة</div>
                    <input className="form-input" placeholder="https://..." value={addForm.image_url} onChange={e => setAddForm({...addForm, image_url: e.target.value})} />

                    <button className="btn-submit" onClick={addProduct} disabled={adding}>
                      {adding ? 'جاري الإضافة...' : '✅ إضافة المنتج'}
                    </button>
                    <button className="btn-cancel" onClick={() => setShowAddForm(false)}>إلغاء</button>
                  </div>
                )}

                {products.length === 0 ? (
                  <div className="empty">لا توجد منتجات بعد — أضف منتجك الأول!</div>
                ) : (
                  products.map(p => (
                    <div key={p.id} className="product-card">
                      <img className="product-img" src={p.fields.image_url || '/placeholder.png'} alt="" />
                      <div className="product-info">
                        <div className="product-name">{p.fields.name}</div>
                        <div className="product-price">π {Number(p.fields.price_pi).toFixed(2)}</div>
                        <div className="product-table">
                          {TABLES.find(t => t.key === p._table)?.icon} {TABLES.find(t => t.key === p._table)?.ar}
                        </div>
                      </div>
                      <button className="btn-delete" onClick={() => deleteProduct(p)} disabled={deleting === p.id}>
                        {deleting === p.id ? '...' : '🗑️'}
                      </button>
                    </div>
                  ))
                )}
              </>
            )}

            {/* تاب الطلبات */}
            {tab === 'orders' && (
              <>
                {orders.length === 0 ? (
                  <div className="empty">لا توجد طلبات بعد</div>
                ) : (
                  orders.map(o => (
                    <div key={o.id} className="order-card">
                      <div className="order-name">📦 {o.fields.product_name || 'منتج'}</div>
                      <div className="order-buyer">👤 @{o.fields.username}</div>
                      <div className="order-price">π {o.fields.amount_pi}</div>
                      <div className="order-date">📅 {o.fields.created_at ? o.fields.created_at.split('T')[0] : 'غير محدد'}</div>
                    </div>
                  ))
                )}
              </>
            )}
          </>
        )}
      </div>

      <div className="bottom-nav">
        <div className="nav-item" onClick={() => window.location.href = '/'}>🏠<br/>الرئيسية</div>
        <div className="nav-item" onClick={() => window.location.href = '/explore'}>🔍<br/>استكشف</div>
        <div className="nav-item" onClick={() => window.location.href = '/my-orders'}>📦<br/>طلباتي</div>
        <div className="nav-item active">🏪<br/>متجري</div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
