import { useEffect, useState } from 'react';

export default function PiPaymentButton({ amount, memo, toUserId, onSuccess, onError, isRefund = false }) {
  const [loading, setLoading] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);

  useEffect(() => {
    // تحميل الـ SDK إذا لم يكن موجوداً (للبيئات خارج Pi Browser)
    if (typeof window !== 'undefined' && !window.Pi) {
      const script = document.createElement('script');
      script.src = 'https://sdk.minepi.com/pi-sdk.js';
      script.onload = async () => {
        await window.Pi.init({ version: '2.0', sandbox: process.env.NODE_ENV !== 'production' });
        setSdkReady(true);
      };
      document.head.appendChild(script);
    } else if (window.Pi) {
      window.Pi.init({ version: '2.0', sandbox: process.env.NODE_ENV !== 'production' }).then(() => setSdkReady(true));
    }
  }, []);

  const handlePayment = async () => {
    if (!sdkReady) {
      alert('Pi SDK is still loading. Please try again.');
      return;
    }

    setLoading(true);
    try {
      // 1. مصادقة المستخدم مع صلاحية المدفوعات
      const auth = await window.Pi.authenticate(['payments', 'username'], async (incompletePayments) => {
        // معالجة أي دفعة غير مكتملة (onIncompletePaymentFound)
        for (const payment of incompletePayments) {
          try {
            await fetch('/api/pi/complete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ paymentId: payment.identifier, txid: payment.transactionIdentifier }),
            });
            console.log(`Completed pending payment: ${payment.identifier}`);
          } catch (err) {
            console.error('Failed to complete pending payment:', err);
          }
        }
      });

      // 2. إنشاء الدفعة (أو الاسترجاع)
      const paymentData = {
        amount,
        memo: isRefund ? `Refund: ${memo}` : memo,
        metadata: { toUserId, type: isRefund ? 'refund' : 'purchase' },
      };

      await window.Pi.createPayment(paymentData, {
        onReadyForServerApproval: async (paymentId) => {
          const res = await fetch('/api/pi/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentId }),
          });
          if (!res.ok) throw new Error('Server approval failed');
        },
        onReadyForServerCompletion: async (paymentId, txid) => {
          const res = await fetch('/api/pi/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentId, txid }),
          });
          if (!res.ok) throw new Error('Server completion failed');
          if (onSuccess) onSuccess({ paymentId, txid });
        },
        onCancel: (paymentId) => {
          console.log('Payment cancelled', paymentId);
          if (onError) onError(new Error('User cancelled'));
        },
        onError: (error, payment) => {
          console.error('Payment error', error, payment);
          if (onError) onError(error);
        },
      });
    } catch (err) {
      console.error('Authentication or payment error:', err);
      if (onError) onError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePayment}
      disabled={loading || !sdkReady}
      className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400"
    >
      {loading ? 'Processing...' : isRefund ? `Refund ${amount} Pi` : `Pay ${amount} Pi`}
    </button>
  );
}