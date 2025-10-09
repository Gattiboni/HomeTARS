import React, { useEffect, useRef, useState } from "react";
import { api } from "../../core/api";
import { getActiveGptSession, setActiveGptSession } from "../../core/gpt";
import { getFlags } from "../../core/flags";
import { speak } from "../../core/voice";

export default function GptLink() {
  const flags = getFlags();
  const [session, setSession] = useState(() => getActiveGptSession());
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const logsRef = useRef(null);

  useEffect(() => {
    const onChange = (e) => setSession(e.detail || null);
    window.addEventListener('tars:gptSessionChanged', onChange);
    return () => window.removeEventListener('tars:gptSessionChanged', onChange);
  }, []);

  useEffect(() => {
    if (logsRef.current) logsRef.current.scrollTo({ top: logsRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function startSession() {
    const res = await api.gpt.session();
    setActiveGptSession(res.session_id);
  }

  async function sendMessage(text) {
    if (!session) return;
    const user = text.trim();
    if (!user) return;
    setMessages((prev) => [...prev, { role: 'user', content: user }]);
    setInput("");

    try {
      const resp = await api.gpt.message(session, user);
      const assistant = resp.assistant || "";
      // typing effect
      const id = Math.random().toString(36).slice(2);
      setMessages((prev) => [...prev, { role: 'assistant', content: '', id }]);
      let i = 0;
      const iv = setInterval(() => {
        i += 1;
        const slice = assistant.slice(0, i);
        setMessages((prev) => prev.map(m => m.id === id ? { ...m, content: slice } : m));
        if (i >= assistant.length) clearInterval(iv);
      }, 24);
      if (!flags.VOICE_DISABLED && assistant) speak(assistant, {});
    } catch (e) {
      setMessages((prev) => [...prev, { role: 'assistant', content: '[Error contacting GPT]'}]);
    }
  }

  function endSession() {
    setActiveGptSession(null);
  }

  if (!session) {
    return (
      <div className="dashboard-panel">
        <div className="panel-header"><h3>GPT Link</h3></div>
        <div className="logs scrollable" ref={logsRef}>
          <div className="hint-line">Awaiting voice activation… Say something like “Hey Tars, connect me to GPT”.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-panel">
      <div className="panel-header">
        <h3>GPT Link</h3>
        <div className="chip active">SESSION ACTIVE: {session}</div>
        <button className="chip" onClick={endSession}>End GPT Session</button>
      </div>
      <div className="logs scrollable" ref={logsRef}>
        {messages.map((m, idx) => (
          <div key={m.id || idx} className={`log-line ${m.role === 'assistant' ? 'info' : 'user'}`}>
            {m.role.toUpperCase()}: {m.content}
          </div>
        ))}
      </div>
      <div className="input-row">
        <span className="prompt">&gt;</span>
        <div className="command-input-wrap">
          <input className="command-input placeholder-dim" value={input} onChange={(e)=> setInput(e.target.value)} onKeyDown={(e)=> { if (e.key==='Enter') sendMessage(input); }} placeholder="type your message…" />
        </div>
      </div>
    </div>
  );
}