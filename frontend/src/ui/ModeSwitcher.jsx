import React from "react";
import { TerminalSquare, ScrollText, Activity, Sliders } from "lucide-react";

const MODES = [
  { id: 'terminal', label: 'Terminal', icon: TerminalSquare },
  { id: 'logs', label: 'Logs', icon: ScrollText },
  { id: 'status', label: 'Status', icon: Activity },
  { id: 'automations', label: 'Automations', icon: Sliders },
];

export default function ModeSwitcher({ mode, onSwitch }) {
  return (
    <div className="mode-switcher">
      {MODES.map(m => {
        const Icon = m.icon;
        return (
          <button key={m.id} className={`mode-btn ${mode===m.id? 'active':''}`} onClick={() => onSwitch(m.id)}>
            <Icon size={16} />
            <span>{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}