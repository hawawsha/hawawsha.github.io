"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquareText, X, Send, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const WELCOME_MESSAGE = {
  role: "assistant",
  content: "أهلاً 👋 أنا مساعد سوق π. أقدر أساعدك تلاقي منتج، أشرحلك كيف تشتري، أو أجاوبك عن أي سؤال بخصوص المتجر.",
};

export function StoreAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  async function sendMessage(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const history = newMessages
        .filter((m) => m !== WELCOME_MESSAGE)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: history.slice(0, -1) }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.message || "عذراً، صار خطأ. جرب مرة ثانية." },
        ]);
      }
    } catch (error) {
      setMessages((prev) => [...prev, { role: "assistant", content: "تعذّر الاتصال بالمساعد حالياً." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {open && (
        <div className="fixed inset-x-4 bottom-40 top-16 z-50 mx-auto flex max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          <div className="flex items-center justify-between bg-brand-gradient px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              <span className="text-sm font-bold">مساعد سوق π</span>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="إغلاق">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3">
            <div className="flex flex-col gap-2.5">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed text-pretty",
                    m.role === "user"
                      ? "self-end bg-brand-gradient text-white"
                      : "self-start bg-secondary text-secondary-foreground"
                  )}
                >
                  {m.content}
                </div>
              ))}
              {loading && (
                <div className="self-start rounded-2xl bg-secondary px-3 py-2 text-sm text-muted-foreground">
                  يكتب...
                </div>
              )}
            </div>
          </div>

          <form onSubmit={sendMessage} className="flex items-center gap-2 border-t border-border p-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="اكتب سؤالك..."
              className="flex-1 rounded-full border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="إرسال"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-white disabled:opacity-50"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="مساعد المتجر"
        className="fixed bottom-24 start-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-gradient text-white shadow-xl transition-transform hover:scale-105"
      >
        {open ? <X className="h-6 w-6" aria-hidden="true" /> : <MessageSquareText className="h-6 w-6" aria-hidden="true" />}
      </button>
    </>
  );
}
