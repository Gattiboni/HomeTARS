import React, { useEffect, useRef, useState } from "react";
import "../styles/terminal.css";
import { BOOT_SEQUENCE } from "../core/mock";
import { audioService } from "../core/sound";
import { api } from "../core/api";

export default function Terminal() {
  const [logs, setLogs] = useState([]);
  const [input, setInput] = useState("");
  const [online, setOnline] = useState(false);
  const [booting, setBooting] = useState(true);
  const logsRef = useRef(null);
  const bootRanRef = useRef(false);
  const lastFetchedRef = useRef(null);
  const retryTimerRef = useRef(null);

  useEffect(() => {
    if (!logsRef.current) return;
    logsRef.current.scrollTo({ top: logsRef.current.scrollHeight, behavior: "smooth" });
  }, [logs]);

  useEffect(() => {
    // show loader line and start handshake with backend
    pushLog("BOOTING SEQUENCE...", "system");

    const handshake = async () => {
      try {
        const s = await api.status();
        setOnline(true);
        // fetch initial logs
        await fetchInitialLogs();
        // run boot sequence only once after online
        runBootSequenceOnce();
        setBooting(false);
      } catch (e) {
        setOnline(false);
        pushLogOnce("CORE LINK LOST", "error");
        scheduleRetry();
      }
    };

    handshake();

    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function scheduleRetry() {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    retryTimerRef.current = setTimeout(async () => {
      try {
        const s = await api.status();
        setOnline(true);
        await fetchInitialLogs();
        runBootSequenceOnce();
        setBooting(false);
      } catch (e) {
        setOnline(false);
        scheduleRetry();
      }
    }, 3000);
  }

  async function fetchInitialLogs() {
    try {
      const res = await api.logs({ limit: 100 });
      // reverse chronological -> we want oldest first on screen
      const items = [...(res.items || [])].reverse();
      const mapped = items.map((doc) => ({ id: doc.id, text: doc.text, type: doc.level }));
      setLogs((prev) => {
        // avoid duplicating if already printed
        const existing = new Set(prev.map((p) => p.id));
        const merged = [...prev, ...mapped.filter((m) => !existing.has(m.id))];
        return merged;
      });
      if (items.length) lastFetchedRef.current = items[items.length - 1].ts;
    } catch (e) {
      // ignore; handled by status retry
    }
  }

  function runBootSequenceOnce() {
    if (bootRanRef.current) return;
    bootRanRef.current = true;
    let t = 0;
    const timers = [];
    BOOT_SEQUENCE.forEach((step, idx) => {
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

  async function handleEnter() {
    const raw = input;
    if (!raw.trim()) return;

    // echo the command locally
    setLogs((prev) => [...prev, { id: crypto.randomUUID(), text: `> ${raw}`, type: "user" }]);
    setInput("");
    audioService.keyClick(0.03, 520);

    if (!online) {
      pushLogOnce("CORE LINK LOST", "error");
      return;
    }

    if (raw.trim().toLowerCase() === "clear") {
      try {
        // still notify backend for traceability
        await api.command(raw.trim());
      } catch (e) {
        // ignore
      }
      setLogs([]);
      return;
    }

    try {
      const res = await api.command(raw.trim());
      const lines = Array.isArray(res?.lines) ? res.lines : [];
      const level = res?.level === "error" ? "error" : "system";
      let delay = 0;
      lines.forEach((line) => {
        delay += 120;
        setTimeout(() => pushLog(line, level), delay);
      });
    } catch (e) {
      pushLogOnce("CORE LINK LOST", "error");
      setOnline(false);
      scheduleRetry();
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
        <div id="logs" ref={logsRef} className="logs" role="log" aria-live="polite">
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
        </div>
      </section>
    </div>
  );
}