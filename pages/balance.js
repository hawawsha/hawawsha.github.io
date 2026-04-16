import { useState } from 'react';
import Head from 'next/head';

export default function BalancePage() {
  const [address, setAddress] = useState('');
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function checkBalance() {
    if (!address.trim()) return;
    setLoading(true);
    setBalance(null);
    setError('');
    try {
      const res = await fetch(`/api/get-balance?walletAddress=${address.trim()}`);
      const data = await res.json();
      if (data.balance !== undefined) {
        setBalance(data.balance);
      } else {
        setError(data.error || 'لم يتم العثور على المحفظة في الماينت');
      }
    } catch (e) {
      setError('خطأ في الاتصال بالشبكة');
    }
    setLoading(false);
  }

  return (
    <>
      <Head>
        <title>رصيد المحفظة - Souq Pi Mainnet</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#0a0118;color:#fff;font-family:'Cairo',sans-serif;direction:rtl;min-height:100vh;padding-bottom:100px;}
        .header{background:rgba(26,11,46,0.95);padding:14px 20px;border-bottom:1px solid #d4af37;display:flex;align-items:center;gap:10px;position:sticky;top:0;z-index:100;}
        .back-btn{background:rgba(255,255,255,0.08);border:none;color:#fff;padding:8px 14px;border-radius:10px;cursor:pointer;font-family:'Cairo',sans-serif;font-size:0.85em;}
        .container{max-width:480px;margin:0 auto;padding:24px 16px;}
        .card{background:rgba(106,13,173,0.15);border:1px solid #6a0dad;border-radius:20px;padding:24px;}
        .input{width:100%;background:#0a0118;border:1.5px solid #6a0dad;padding:13px 16px;border-radius:14px;color:#fff;font-family:'Cairo',sans-serif;font-size:0.9em;outline:none;margin-bottom:12px;text-align:left;direction:ltr;}
        .input::placeholder{color:#555;text-align:right;direction:rtl;}
        .btn{background:linear-gradient(135deg,#6a0dad,#d4af37);color:#fff;border:none;padding:13px;border-radius:14px;width:100%;font-weight:900;cursor:pointer;font-family:'Cairo',sans-serif;font-size:1em;}
        .btn:disabled{opacity:0.6;}
        .result{background:#1a0b2e;border:1px solid #331a5e;border-radius:16px;padding:20px;margin-top:20px;text-align:center;}
        .bottom-nav{position:fixed;bottom:0;left:0;right:0;background:#1a0b2e;display:flex;justify-content:space-around;padding:12px;border-top:1px solid #6a0dad;z-index:1000;}
        .nav-item{text-align:center;font-size:0.7em;cursor:pointer;color:#b0b0b0;flex:1;}
        .nav-item.active{color:#d4af37;}
      `}</style>

      <div className="header">
        <button className="back-btn" onClick={() => window.location.href = '/'}>← رجوع</button>
        <div style={{fontWeight:900}}>💰 رصيد الماينت</div>
      </div>

      <div className="container">
        <div className="card">
          <div style={{textAlign:'center', marginBottom:20}}>
            <div style={{fontSize:'2.5em'}}>💰</div>
            <div style={{fontWeight:800, fontSize:'1.1em', margin:'8px 0 4px'}}>رصيد محفظة Pi الحقيقي</div>
            <div style={{fontSize:'0.8em', color:'#b0b0b0'}}>استعلم عن رصيدك المتاح في الشبكة العامة</div>
          </div>

          <input
            className="input"
            type="text"
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="أدخل عنوان المحفظة (G...)"
          />

          <button className="btn" onClick={checkBalance} disabled={loading || !address.trim()}>
            {loading ? 'جاري الاتصال بالشبكة...' : '🔍 استعلام الآن'}
          </button>

          {balance !== null && (
            <div className="result">
              <div style={{color:'#b0b0b0', fontSize:'0.85em', marginBottom:8}}>الرصيد المتاح:</div>
              <div style={{fontSize:'2.2em', fontWeight:900, color:'#4ade80'}}>
                π {parseFloat(balance).toLocaleString(undefined, {minimumFractionDigits: 4})}
              </div>
            </div>
          )}

          {error && (
            <div className="result">
              <div style={{color:'#ef4444', fontWeight:700}}>{error}</div>
            </div>
          )}
        </div>
      </div>

      <div className="bottom-nav">
        <div className="nav-item" onClick={() => window.location.href = '/'}>🏠<br/>الرئيسية</div>
        <div className="nav-item" onClick={() => window.location.href = '/explore'}>🔍<br/>استكشف</div>
        <div className="nav-item active">💰<br/>الرصيد</div>
        <div className="nav-item" onClick={() => window.location.href = '/my-orders'}>📦<br/>طلباتي</div>
      </div>
    </>
  );
}
