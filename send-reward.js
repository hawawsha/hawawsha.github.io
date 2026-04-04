import { useState, useEffect } from 'react';

export default function SendReward() {
  const [uid, setUid] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    const initPi = async () => {
      try {
        if (!window.Pi) {
          setStatus("❌ افتح الصفحة داخل Pi Browser");
          return;
        }
        window.Pi.init({ version: "2.0", sandbox: true });
        const auth = await window.Pi.authenticate(
          ['username', 'payments', 'wallet_address']
        );
        if (auth?.user) {
          setUid(auth.user.uid);
          setUsername(auth.user.username);
          setWalletAddress(auth.user.wallet_address);
          setStatus('✅ تم تسجيل الدخول: ' + auth.user.username);
        }
      } catch (err) {
        setStatus("❌ خطأ: " + err.message);
      }
    };
    initPi();
  }, []);

  return (
    <div style={{
      padding: 30, direction: 'rtl',
      fontFamily: 'Arial', maxWidth: 500, margin: '0 auto'
    }}>
      <h2 style={{ color: '#6a0dad', textAlign: 'center' }}>
        سوق Pi 🎁
      </h2>
      <div style={{
        background: username ? '#f0e6ff' : '#fff3cd',
        padding: 15, borderRadius: 10,
        marginTop: 20, textAlign: 'center'
      }}>
        {username
          ? <p style={{ fontSize: 18 }}>👤 مرحباً <strong>{username}</strong></p>
          : <p>⏳ جارٍ تحميل بياناتك...</p>
        }
      </div>
      {status && (
        <p style={{
          marginTop: 20, fontWeight: 'bold',
          textAlign: 'center', fontSize: 16
        }}>
          {status}
        </p>
      )}
    </div>
  );
}
