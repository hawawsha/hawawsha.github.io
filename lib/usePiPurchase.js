// lib/usePiPurchase.js
"use client";

import { useState } from "react";
import { waitForPiReady } from "@/lib/pi/piReady";

export function usePiPurchase() {
  const [loadingProductId, setLoadingProductId] = useState(null);
  const [message, setMessage] = useState("");
  const [piUser, setPiUser] = useState(null);
  const [debugLogs, setDebugLogs] = useState([]);

  function logDebug(...args) {
    const line = args
      .map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a)))
      .join(" ");
    console.log(...args);
    setDebugLogs((prev) => [...prev.slice(-30), `${new Date().toLocaleTimeString()} - ${line}`]);
  }

  async function authenticateWithPi() {
    logDebug("authenticateWithPi: started");

    // ننتظر اكتمال Pi.init() فعلياً قبل أي استدعاء لاحق لـ Pi SDK
    try {
      await waitForPiReady();
      logDebug("authenticateWithPi: Pi.init confirmed ready");
    } catch (readyError) {
      logDebug("authenticateWithPi: Pi.init not ready:", readyError.message);
      throw readyError;
    }

    return new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !window.Pi) {
        logDebug("authenticateWithPi: window.Pi is missing");
        reject(new Error("Pi SDK غير متوفر"));
        return;
      }

      logDebug("authenticateWithPi: window.Pi exists, calling authenticate()");

      const onIncompletePaymentFound = (payment) => {
        logDebug("Incomplete payment found, attempting to complete it:", payment.identifier);

        fetch("/api/pi/complete-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentId: payment.identifier,
            txid: payment.transaction?.txid,
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            logDebug("Incomplete payment resolution result:", JSON.stringify(data));
          })
          .catch((err) => {
            logDebug("Failed to resolve incomplete payment:", err.message);
          });
      };

      try {
        window.Pi.authenticate(["payments"], onIncompletePaymentFound)
          .then((auth) => {
            logDebug("Pi authenticate SUCCESS, uid:", auth?.user?.uid);
            setPiUser(auth.user);
            resolve(auth);
          })
          .catch((error) => {
            logDebug("Pi authenticate REJECTED:", error?.message || String(error));
            reject(error);
          });
      } catch (syncError) {
        logDebug("Pi authenticate THREW synchronously:", syncError?.message || String(syncError));
        reject(syncError);
      }
    });
  }

  async function handleBuy(product) {
    logDebug("=== handleBuy START for:", product.name, "===");
    try {
      setLoadingProductId(product._id);
      setMessage("");

      if (typeof window === "undefined" || !window.Pi) {
        logDebug("window.Pi not found - stopping here");
        setMessage("Pi SDK غير متوفر. الرجاء فتح الصفحة عبر تطبيق Pi Browser.");
        return;
      }

      logDebug("window.Pi found, proceeding to authenticate");

      let currentUser = piUser;
      if (!currentUser) {
        try {
          const authPromise = authenticateWithPi();
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("انتهت المهلة - Pi Network لم يرد خلال 20 ثانية")), 20000)
          );
          const auth = await Promise.race([authPromise, timeoutPromise]);
          currentUser = auth.user;
        } catch (authError) {
          logDebug("authenticate failed:", authError?.message || String(authError));
          setMessage("فشل تسجيل الدخول عبر Pi Network: " + (authError?.message || "خطأ غير معروف"));
          return;
        }
      }

      logDebug("currentUser:", currentUser);

      if (!currentUser?.uid) {
        logDebug("currentUser.uid missing, stopping");
        setMessage("لم يتم الحصول على معرّف المستخدم (uid) من Pi Network. حاول تسجيل الدخول من جديد.");
        return;
      }

      logDebug("Creating order in MongoDB...");
      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.productId,
          buyerUid: currentUser.uid,
          buyerUsername: currentUser.username,
        }),
      });

      logDebug("HTTP Status (create order):", orderRes.status);
      const orderData = await orderRes.json();

      if (!orderRes.ok || !orderData.success) {
        logDebug("Order creation failed:", orderData.message);
        setMessage(orderData.message || "فشل إنشاء الطلب");
        return;
      }

      const order = orderData.data;
      logDebug("Order created, orderId:", order.orderId);

      logDebug("Calling window.Pi.createPayment...");
      window.Pi.createPayment(
        {
          amount: order.payment.amount,
          memo: `شراء ${order.product.name}`,
          metadata: { orderId: order.orderId },
        },
        {
          onReadyForServerApproval: async (paymentId) => {
            logDebug("onReadyForServerApproval:", paymentId);

            const approveRes = await fetch("/api/pi/approve-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ paymentId, orderId: order.orderId }),
            });

            logDebug("HTTP Status (approve-payment):", approveRes.status);
            const approveData = await approveRes.json();

            if (!approveRes.ok || !approveData.success) {
              setMessage(approveData.message || "فشلت الموافقة على الدفع");
            }
          },

          onReadyForServerCompletion: async (paymentId, txid) => {
            logDebug("onReadyForServerCompletion:", paymentId, txid);

            const completeRes = await fetch("/api/pi/complete-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ paymentId, txid }),
            });

            logDebug("HTTP Status (complete-payment):", completeRes.status);
            const completeData = await completeRes.json();

            if (completeRes.ok && completeData.success) {
              setMessage("تم الدفع وإتمام الطلب بنجاح ✅");
            } else {
              setMessage(completeData.message || "فشل إتمام الدفع");
            }
          },

          onCancel: async (paymentId) => {
            logDebug("onCancel:", paymentId);
            setMessage("تم إلغاء عملية الدفع");

            try {
              const cancelRes = await fetch("/api/orders", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId: order.orderId, status: "cancelled" }),
              });
              logDebug("HTTP Status (cancel order):", cancelRes.status);
            } catch (cancelErr) {
              logDebug("Failed to mark order as cancelled:", cancelErr.message);
            }
          },

          onError: async (error, payment) => {
            logDebug("onError:", error?.message || String(error));
            setMessage("حدث خطأ أثناء الدفع عبر Pi Network");

            try {
              const cancelRes = await fetch("/api/orders", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId: order.orderId, status: "cancelled" }),
              });
              logDebug("HTTP Status (cancel order after error):", cancelRes.status);
            } catch (cancelErr) {
              logDebug("Failed to mark order as cancelled:", cancelErr.message);
            }
          },
        }
      );
      logDebug("window.Pi.createPayment call returned (fire-and-forget)");
    } catch (error) {
      logDebug("CATCH block error:", error?.message || String(error));
      setMessage("خطأ: " + error.message);
    } finally {
      logDebug("=== handleBuy FINALLY - resetting loading state ===");
      setLoadingProductId(null);
    }
  }

  return { loadingProductId, message, debugLogs, handleBuy, piUser, authenticateWithPi, logDebug };
}
