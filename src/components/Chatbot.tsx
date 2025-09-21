"use client";
import React, { useEffect, useRef, useState } from 'react';

type Msg = { id: string; role: 'user' | 'bot'; text: string; ts: number };

const STORAGE_KEY = 'seabig_chat_history_v1';

function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) as Msg[] : [];
    } catch {
      return [];
    }
  });
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch {}
  }, [messages]);

  useEffect(() => {
    if (open) setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight }), 50);
  }, [open]);

  const push = (role: Msg['role'], text: string) => {
    const m: Msg = { id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`, role, text, ts: Date.now() };
    setMessages((s) => [...s, m]);
    return m;
  };

  async function send() {
    const t = text.trim();
    if (!t) return;
    push('user', t);
    setText('');
    setLoading(true);
    setTyping(true);
    try {
      const res = await fetch('/api/chat', { method: 'POST', body: JSON.stringify({ message: t }), headers: { 'Content-Type': 'application/json' } });
      const j = await res.json();
      const reply = j.reply || j.error || 'No reply';
      push('bot', String(reply));
    } catch (err) {
      console.error('chat send error', err);
      push('bot', 'Error contacting chat service');
    } finally {
      setLoading(false);
      setTyping(false);
      setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }), 50);
    }
  }

  function clearHistory() {
    setMessages([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }

  return (
    <div>
      <div className="fixed bottom-6 right-6 z-50">
        {open ? (
          <div className="w-96 max-w-[92vw] h-[520px] bg-white/95 backdrop-blur-md shadow-2xl rounded-2xl overflow-hidden border border-slate-200 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-sky-700 via-sky-600 to-sky-500 text-white">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold">SF</div>
                <div>
                  <div className="font-semibold">Samudriksha Assistant</div>
                  <div className="text-xs opacity-80">Ask about species, datasets, and maps</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={clearHistory} className="text-sm bg-white/10 px-2 py-1 rounded hover:bg-white/20">Clear</button>
                <button aria-label="Close chat" onClick={() => setOpen(false)} className="text-sm bg-white/10 px-2 py-1 rounded hover:bg-white/20">✕</button>
              </div>
            </div>

            <div ref={listRef} className="flex-1 p-4 overflow-auto space-y-3 bg-gradient-to-b from-white to-slate-50">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[78%] ${m.role === 'user' ? 'bg-sky-50 text-sky-900' : 'bg-white text-slate-900'} rounded-xl p-3 shadow-sm`}> 
                    <div className="text-sm whitespace-pre-wrap">{m.text}</div>
                    <div className="text-xs opacity-60 mt-1 text-right">{formatTime(m.ts)}</div>
                  </div>
                </div>
              ))}

              {typing && (
                <div className="flex justify-start">
                  <div className="bg-white rounded-xl p-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse" />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse delay-75" />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse delay-150" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-4 py-3 border-t bg-white">
              <div className="flex gap-2 items-center">
                <textarea rows={1} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Type a question..." className="flex-1 resize-none px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-sky-300" />
                <div className="flex gap-2">
                  <button onClick={() => { setText(''); }} className="px-3 py-2 bg-slate-100 rounded-md">Reset</button>
                  <button onClick={send} disabled={loading} className="px-4 py-2 bg-sky-600 text-white rounded-md shadow">{loading ? 'Thinking…' : 'Send'}</button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <button onClick={() => setOpen(true)} aria-label="Open chat" className="w-16 h-16 rounded-full bg-gradient-to-br from-sky-600 to-sky-500 text-white shadow-xl flex items-center justify-center text-2xl">💬</button>
        )}
      </div>
    </div>
  );
}
