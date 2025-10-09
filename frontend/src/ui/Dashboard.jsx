import React, { useEffect, useState } from "react";
import Terminal from "./Terminal";
import LogsPanel from "./dashboard/LogsPanel";
import StatusPanel from "./dashboard/StatusPanel";
import AutomationsPanel from "./dashboard/AutomationsPanel";
import ModeSwitcher from "./ModeSwitcher";
import "../styles/terminal.css";
import "../core/automation"; // ensure global automation store attaches listeners

const VALID = new Set(["terminal","logs","status","automations"]);

export default function Dashboard() {
  const [mode, setMode] = useState(() => {
    const m = localStorage.getItem('tars_mode') || 'terminal';
    return VALID.has(m) ? m : 'terminal';
  });

  useEffect(() => { localStorage.setItem('tars_mode', mode); }, [mode]);

  useEffect(() => {
    const handler = (e) => { const next = (e.detail || '').toLowerCase(); if (VALID.has(next)) setMode(next); };
    window.addEventListener('tars:switchMode', handler);
    return () => window.removeEventListener('tars:switchMode', handler);
  }, []);

  function onSwitch(next) { setMode(next); }

  return (
    <div className="dashboard-wrap">
      <ModeSwitcher mode={mode} onSwitch={onSwitch} />
      <div className="dashboard-content fade-in">
        {mode === 'terminal' && <Terminal />}
        {mode === 'logs' && <LogsPanel />}
        {mode === 'status' && <StatusPanel />}
        {mode === 'automations' && <AutomationsPanel />}
      </div>
    </div>
  );
}