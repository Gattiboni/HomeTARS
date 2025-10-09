import React, { useEffect, useRef, useState } from "react";
import "../styles/terminal.css";
import { BOOT_SEQUENCE } from "../core/mock";
import { audioService } from "../core/sound";
import { api } from "../core/api";
import { createRealtime } from "../core/ws";
import { startMic, speak } from "../core/voice";
import { Mic } from "lucide-react";

export default function Terminal() {
  const [logs, setLogs] = useState([]);
  const [input, setInput] = useState("");
  const [online, setOnline] = useState(false);
  const [booting, setBooting] = useState(true);
  const [wsActive, setWsActive] = useState(false);
  const [flash, setFlash] = useState(false);
  const [debug, setDebug] = useState(false);
  const [metrics, setMetrics] = useState({ lastHttpMs: null, lastWsAt: null, wsCount: 0, lastAiMs: null });
  const [micState, setMicState] = useState('idle'); // idle|active|denied|stopped
  const [voiceMode, setVoiceMode] = useState('passive'); // passive|armed

  const logsRef = useRef(null);
  const bootRanRef = useRef(false);
  const lastFetchedRef = useRef(null);
  const retryTimerRef = useRef(null);
  const wsRef = useRef(null);
  const seenIdsRef = useRef(new Set());
  const thinkingRef = useRef({ id: null, timer: null, phase: 0 });
  const micRef = useRef(null);
  const aggRef = useRef({ buf: '', timer: null });

  const KNOWN = useRef(new Set(["help", "status", "time", "clear"]))

  useEffect(() => {
    if (!logsRef.current) return;
    logsRef.current.scrollTo({ top: logsRef.current.scrollHeight, behavior: "smooth" });
  }, [logs]);

  useEffect(() => {
    pushLogOnce("BOOTING SEQUENCE...", "system");

    const handshake = async () => {
      const t0 = performance.now();
      try {
        await api.status();
        const t1 = performance.now();
        setMetrics((m) => ({ ...m, lastHttpMs: Math.round(t1 - t0) }));
        setOnline(true);
        await fetchInitialLogs();
        runBootSequenceOnce();
        setBooting(false);
        startRealtime();
        // Start microphone listening once online
        micRef.current = startMic({
          onTranscript: onVoiceData,
          onError: () => {},
          onState: setMicState,
        });
      } catch (e) {
        setOnline(false);
        pushLogOnce("CORE LINK LOST", "error");
        scheduleRetry();
      }
    };

    handshake();

    const onKey = (e) => {
      if ((e.altKey || e.ctrlKey) && (e.key === "d" || e.key === "D")) {
        setDebug((d) => !d);
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      window.removeEventListener("keydown", onKey);
      try { wsRef.current && wsRef.current.stop(); } catch (_) {}
      hideThinking();
      try { micRef.current && micRef.current.stop(); } catch (_) {}
      clearAggTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function scheduleRetry() {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    retryTimerRef.current = setTimeout(async () => {
      try {
        const t0 = performance.now();
        await api.status();
        const t1 = performance.now();
        setMetrics((m) => ({ ...m, lastHttpMs: Math.round(t1 - t0) }));
        setOnline(true);
        await fetchInitialLogs();
        runBootSequenceOnce();
        setBooting(false);
        startRealtime();
        micRef.current = startMic({ onTranscript: onVoiceData, onError: () => {}, onState: setMicState });
      } catch (e) {
        setOnline(false);
        scheduleRetry();
      }
    }, 3000);
  }

  function clearAggTimer() {
    if (aggRef.current.timer) {
      clearTimeout(aggRef.current.timer);
      aggRef.current.timer = null;
    }
  }

  async function fetchInitialLogs() {
    try {
      const res = await api.logs({ limit: 100 });
      const items = [...(res.items || [])].reverse();
      const mapped = items.map((doc) => ({ id: doc.id, text: doc.text, type: doc.level }));
      setLogs((prev) => {
        const existing = new Set(prev.map((p) => p.id));
        const merged = [...prev, ...mapped.filter((m) => !existing.has(m.id))];
        merged.forEach((m) => seenIdsRef.current.add(m.id));
        return merged;
      });
      if (items.length) lastFetchedRef.current = items[items.length - 1].ts;
    } catch (e) {}
  }

  function startRealtime() {
    if (wsRef.current) return;
    wsRef.current = createRealtime({
      onOpen: () => setWsActive(true),
      onClose: () => setWsActive(false),
      onError: () => {},
      onLog: (item) => {
        setMetrics((m) => ({ ...m, lastWsAt: new Date(), wsCount: (m.wsCount || 0) + 1 }));
        if (seenIdsRef.current.has(item.id)) return;
        seenIdsRef.current.add(item.id);
        typeOut(item.text, item.level);
      },
    });
  }

  function runBootSequenceOnce() {
    if (bootRanRef.current) return;
    bootRanRef.current = true;
    let t = 0;
    const timers = [];
    BOOT_SEQUENCE.forEach((step) => {
      t += step.delay;
      const id = setTimeout(() => pushLog(step.text, "system"), t);
      timers.push(id);
    });
  }

  function pushLog(text, type = "system") {
    setLogs((prev) => [...prev, { id: crypto.randomUUID(), text, type }]);
    audioService.beep();
  }

  function pushLogOnce(text, type = "system") {
    setLogs((prev) => {
      if (prev.some((l) => l.text === text && l.type === type)) return prev;
      return [...prev, { id: crypto.randomUUID(), text, type }];
    });
    audioService.beep();
  }

  // typing effect for incoming lines
  function typeOut(text, type) {
    const id = crypto.randomUUID();
    const obj = { id, text: "", type: type || "system", __target: text };
    setLogs((prev) => [...prev, obj]);
    let i = 0;
    const iv = setInterval(() => {
      i += 1;
      const next = text.slice(0, i);
      setLogs((prev) => prev.map((l) => (l.id === id ? { ...l, text: next } : l)));
      if (i >= text.length) clearInterval(iv);
    }, Math.min(140, Math.max(50, 1000 / (text.length || 1))));
  }

  function showThinking() {
    hideThinking();
    const id = crypto.randomUUID();
    setLogs((prev) => [...prev, { id, text: "…", type: "info" }]);
    const timer = setInterval(() => {
      thinkingRef.current.phase = (thinkingRef.current.phase + 1) % 3;
      const dots = ".".repeat(thinkingRef.current.phase + 1);
      setLogs((prev) => prev.map((l) => (l.id === id ? { ...l, text: dots } : l)));
    }, 220);
    thinkingRef.current = { id, timer, phase: 0 };
  }

  function hideThinking() {
    if (thinkingRef.current.timer) {
      clearInterval(thinkingRef.current.timer);
    }
    const id = thinkingRef.current.id;
    if (id) {
      setLogs((prev) => prev.filter((l) => l.id !== id));
    }
    thinkingRef.current = { id: null, timer: null, phase: 0 };
  }

  // Voice pipeline with wake word
  async function onVoiceData(data) {
    const { text, wake, command_text } = data || {};
    if (text) {
      // Already logged by backend; we can add minimal UI signals if needed
    }
    if (voiceMode === 'passive') {
      if (wake) {
        setVoiceMode('armed');
        audioService.keyClick(0.04, 620); // confirmation beep
        aggRef.current.buf = command_text ? command_text : '';
        resetAggTimer();
      }
      return;
    }
    // armed mode
    if (wake && command_text) {
      // If wake repeats, treat trailing text as additional buffer
      aggRef.current.buf = (aggRef.current.buf + ' ' + command_text).trim();
    } else if (text) {
      // accumulate any recognized text when armed
      aggRef.current.buf = (aggRef.current.buf + ' ' + text).trim();
    }
    resetAggTimer();
  }

  function resetAggTimer() {
    clearAggTimer();
    aggRef.current.timer = setTimeout(async () => {
      const finalText = (aggRef.current.buf || '').trim();
      aggRef.current.buf = '';
      if (!finalText) return;
      showThinking();
      try {
        const t0 = performance.now();
        const ai = await api.ai(finalText);
        const t1 = performance.now();
        hideThinking();
        setMetrics((m) => ({ ...m, lastAiMs: Math.round(t1 - t0) }));

        if (!wsActive) {
          const lines = Array.isArray(ai?.lines) ? ai.lines : [];
          lines.forEach((line, idx) => setTimeout(() => pushLog(line, ai?.level || 'info'), 120 * (idx + 1)));
        }
        const speakText = (ai?.lines || []).join('. ');
        if (speakText) await speak(speakText, {});
      } catch (e) {
        hideThinking();
      } finally {
        setVoiceMode('passive');
      }
    }, 1500); // finalize after pause
  }

  async function handleEnter() {
    const raw = input;
    if (!raw.trim()) return;

    setFlash(true);
    setTimeout(() => setFlash(false), 180);

    if (!wsActive) {
      setLogs((prev) => [...prev, { id: crypto.randomUUID(), text: `> ${raw}`, type: "user" }]);
    }

    setInput("");
    audioService.keyClick(0.03, 520);

    if (!online) {
      pushLogOnce("CORE LINK LOST", "error");
      return;
    }

    const cmdLower = raw.trim().toLowerCase();
    const isLocal = KNOWN.current.has(cmdLower);

    if (cmdLower === "clear") {
      try {
        const t0 = performance.now();
        await api.command(raw.trim());
        const t1 = performance.now();
        setMetrics((m) => ({ ...m, lastHttpMs: Math.round(t1 - t0) }));
      } catch (e) {}
      setLogs([]);
      return;
    }

    let wasError = false;
    try {
      const t0 = performance.now();
      const res = await api.command(raw.trim());
      const t1 = performance.now();
      setMetrics((m) => ({ ...m, lastHttpMs: Math.round(t1 - t0) }));
      wasError = res?.level === "error";

      if (!wsActive && !wasError) {
        const lines = Array.isArray(res?.lines) ? res.lines : [];
        const level = res?.level === "error" ? "error" : "system";
        let delay = 0;
        lines.forEach((line) => {
          delay += 120;
          setTimeout(() => pushLog(line, level), delay);
        });
      }
    } catch (e) {
      pushLogOnce("CORE LINK LOST", "error");
      setOnline(false);
      scheduleRetry();
      return;
    }

    if (!isLocal) {
      showThinking();
      try {
        const t0 = performance.now();
        const ai = await api.ai(raw.trim());
        const t1 = performance.now();
        hideThinking();
        setMetrics((m) => ({ ...m, lastAiMs: Math.round(t1 - t0) }));

        if (!wsActive) {
          const lines = Array.isArray(ai?.lines) ? ai.lines : [];
          const type = ai?.level || "info";
          let delay = 0;
          lines.forEach((line) => {
            delay += 120;
            setTimeout(() => pushLog(line, type), delay);
          });
        }
      } catch (e) {
        hideThinking();
      }
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleEnter();
      return;
    }
    if (e.key.length === 1 || e.key === "Backspace" || e.key === "Space") {
      audioService.keyClick();
    }
  }

  return (
    <div className="terminal-wrap app-root" onClick={() => audioService.ensureContext?.() }>
      <header className="terminal-header">TARS SYSTEM ONLINE</header>

      <section className="terminal-panel" aria-label="terminal">
        <div id="logs" ref={logsRef} className={`logs ${flash ? 'logs-flash' : ''}`} role="log" aria-live="polite">
          {logs.map((l) => (
            <div key={l.id} className={`log-line ${l.type}`}>{l.text}</div>
          ))}
        </div>

        <div className="input-row">
          <span className="prompt">&gt;</span>
          <div className="command-input-wrap">
            <input
              id="command-input"
              className="command-input placeholder-dim"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="type your command..."
              autoFocus
              autoComplete="off"
              spellCheck={false}
              aria-label="command input"
            />
          </div>
          <div className={`mic-indicator ${micState === 'active' ? 'on' : micState === 'denied' ? 'denied' : ''}`} title={micState}>
            <Mic size={14} />
          </div>
          <div className={`badge ${voiceMode === 'passive' ? 'badge-listening' : 'badge-ready'}`}>
            {voiceMode === 'passive' ? 'LISTENING' : 'READY'}
          </div>
        </div>

        {voiceMode === 'passive' && (
          <div className="hint-line">aguardando ‘Hey Tars’…</div>
        )}

        {debug && (
          <div className="debug-panel">
            <div>HTTP last: {metrics.lastHttpMs != null ? `${metrics.lastHttpMs} ms` : '—'}</div>
            <div>AI last: {metrics.lastAiMs != null ? `${metrics.lastAiMs} ms` : '—'}</div>
            <div>WS events: {metrics.wsCount || 0}</div>
            <div>WS last: {metrics.lastWsAt ? new Date(metrics.lastWsAt).toLocaleTimeString() : '—'}</div>
          </div>
        )}
      </section>
    </div>
  );
}