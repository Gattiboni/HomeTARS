import React, { useEffect, useRef, useState } from "react";
import "../styles/terminal.css";
import { BOOT_SEQUENCE, resolveCommand } from "../core/mock";
import { audioService } from "../core/sound";

// NOTE: Phase 1 is fully front-end only (mocked). No backend calls here.

export default function Terminal() {
  const [logs, setLogs] = useState([]);
  const [input, setInput] = useState("");
  const logsRef = useRef(null);
  const bootedRef = useRef(false);

  // Auto-scroll on new logs
  useEffect(() => {
    if (!logsRef.current) return;
    logsRef.current.scrollTo({ top: logsRef.current.scrollHeight, behavior: "smooth" });
  }, [logs]);

  // Boot sequence once
  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;

    let t = 0;
    const timers = [];
    BOOT_SEQUENCE.forEach((step) => {
      t += step.delay;
      const id = setTimeout(() => {
        pushLog(step.text, "system");
      }, t);
      timers.push(id);
    });

    return () => timers.forEach((id) => clearTimeout(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pushLog(text, type = "system") {
    setLogs((prev) => [...prev, { id: crypto.randomUUID(), text, type }]);
    // sound per log line
    audioService.beep();
  }

  function handleEnter() {
    const raw = input;
    if (!raw.trim()) return;

    // echo the command to the log
    setLogs((prev) => [...prev, { id: crypto.randomUUID(), text: `> ${raw}`, type: "user" }]);

    // clear field and play click/beep
    setInput("");
    audioService.keyClick(0.03, 520);

    // slight processing delay for realism
    const result = resolveCommand(raw);
    setTimeout(() => {
      if (result.type === "action" && result.action === "clear") {
        setLogs([]);
        return;
      }

      if (result.lines && result.lines.length) {
        // print each response line with tiny delay
        let delay = 0;
        result.lines.forEach((line) => {
          delay += 120;
          setTimeout(() => pushLog(line, result.type === "error" ? "error" : "system"), delay);
        });
      }
    }, 180);
  }

  function onKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleEnter();
      return;
    }
    // subtle click while typing
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