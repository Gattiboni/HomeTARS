import React, { useEffect, useState } from "react";
import { api } from "../../core/api";

function Dot({ ok }) {
  return <span style={{display:'inline-block', width:8, height:8, borderRadius:8, background: ok? 'var(--neon)' : '#ff5577', boxShadow: ok? '0 0 8px rgba(0,255,153,0.35)' : '0 0 8px rgba(255,85,119,0.35)'}}/>;
}

export default function StatusPanel() {
  const [apiOk, setApiOk] = useState(false);
  const [mic, setMic] = useState('unknown');
  const [uptimeStart] = useState(Date.now());
  const [temp] = useState(22.4); // mocked

  async function ping() {
    try { await api.status(); setApiOk(true); } catch { setApiOk(false); }
  }

  useEffect(() => {
    ping();
    const t = setInterval(ping, 5000);
    if (navigator.permissions && navigator.permissions.query) {
      try {
        navigator.permissions.query({ name: 'microphone' }).then((st) => {
          const fn = () => setMic(st.state);
          fn(); st.onchange = fn;
        }).catch(()=>{});
      } catch {}
    }
    return () => clearInterval(t);
  }, []);

  const netOk = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const uptimeSec = Math.floor((Date.now() - uptimeStart)/1000);
  const fmtUptime = `${Math.floor(uptimeSec/60)}m ${uptimeSec%60}s`;

  return (
    <div className="dashboard-panel">
      <div className="panel-header"><h3>Status</h3></div>
      <div className="grid-2">
        <div className="card">
          <div className="card-title">API</div>
          <div className="card-body"><Dot ok={apiOk}/> <span style={{marginLeft:8}}>{apiOk? 'ONLINE' : 'OFFLINE'}</span></div>
        </div>
        <div className="card">
          <div className="card-title">Network</div>
          <div className="card-body"><Dot ok={netOk}/> <span style={{marginLeft:8}}>{netOk? 'ONLINE' : 'OFFLINE'}</span></div>
        </div>
        <div className="card">
          <div className="card-title">Microphone</div>
          <div className="card-body">{mic}</div>
        </div>
        <div className="card">
          <div className="card-title">Temperature</div>
          <div className="card-body">{temp.toFixed(1)} °C</div>
        </div>
        <div className="card">
          <div className="card-title">Uptime</div>
          <div className="card-body">{fmtUptime}</div>
        </div>
      </div>
    </div>
  );
}