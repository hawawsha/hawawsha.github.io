// lib/pi/config.js

// يدعم اسمين للمتغير حتى لا يحتاج أي تعديل على إعدادات Vercel الحالية:
// PI_API_KEY (الاسم المستخدم حالياً بمشروعك) أو PI_NETWORK_API_KEY (الاسم البديل الشائع بالتوثيق)
const PI_API_KEY = process.env.PI_API_KEY || process.env.PI_NETWORK_API_KEY;
const PI_APP_ID = process.env.PI_APP_ID;

const PI_NETWORK_ENV = process.env.PI_NETWORK_ENV === "mainnet" ? "mainnet" : "testnet";

const PI_BASE_URL = "https://api.minepi.com/v2";

const piClient = {
  env: PI_NETWORK_ENV,
  appId: PI_APP_ID,

  async completePayment(paymentId, txid) {
    if (!paymentId || !txid) {
      throw new Error("completePayment: paymentId و txid مطلوبان");
    }

    const response = await fetch(`${PI_BASE_URL}/payments/${paymentId}/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${PI_API_KEY}`,
      },
      body: JSON.stringify({ paymentId, txid }),
    });

    console.log("HTTP Status (Pi completePayment):", response.status);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        `فشل استدعاء completePayment من Pi Network: ${response.status} - ${JSON.stringify(data)}`
      );
    }

    return data;
  },

  async approvePayment(paymentId) {
    if (!paymentId) {
      throw new Error("approvePayment: paymentId مطلوب");
    }

    const response = await fetch(`${PI_BASE_URL}/payments/${paymentId}/approve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${PI_API_KEY}`,
      },
    });

    console.log("HTTP Status (Pi approvePayment):", response.status);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        `فشل استدعاء approvePayment من Pi Network: ${response.status} - ${JSON.stringify(data)}`
      );
    }

    return data;
  },

  // ===== App-to-User (A2U) - يُستخدم لتنفيذ الاسترجاعات الفعلية =====

  async createA2UPayment({ amount, memo, metadata, uid }) {
    if (!amount || !uid) {
      throw new Error("createA2UPayment: amount و uid مطلوبان");
    }

    const response = await fetch(`${PI_BASE_URL}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${PI_API_KEY}`,
      },
      body: JSON.stringify({
        payment: { amount, memo: memo || "", metadata: metadata || {}, uid },
      }),
    });

    console.log("HTTP Status (Pi createA2UPayment):", response.status);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        `فشل استدعاء createA2UPayment من Pi Network: ${response.status} - ${JSON.stringify(data)}`
      );
    }

    return data; // يحتوي identifier و recipient (to_address) لاحقاً بعد جلب التفاصيل
  },

  async getPayment(paymentId) {
    if (!paymentId) {
      throw new Error("getPayment: paymentId مطلوب");
    }

    const response = await fetch(`${PI_BASE_URL}/payments/${paymentId}`, {
      method: "GET",
      headers: {
        Authorization: `Key ${PI_API_KEY}`,
      },
    });

    console.log("HTTP Status (Pi getPayment):", response.status);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        `فشل استدعاء getPayment من Pi Network: ${response.status} - ${JSON.stringify(data)}`
      );
    }

    return data;
  },
};

module.exports = piClient;
