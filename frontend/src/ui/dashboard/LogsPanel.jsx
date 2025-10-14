import React, { useEffect, useRef, useState } from "react";
import { api } from "../../core/api";

export default function LogsPanel() {
  const [items, setItems] = useState([]);
  const [level, setLevel] = useState("all");
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);

  function filterAutomationByType(list, type) {
    if (!type) return list;
    const t = type.toLowerCase();
    if (t === 'lights') return list.filter(it => (it.text||'').includes('lights_'));
    if (t === 'climate') return list.filter(it => (it.text||'').includes('set_temperature'));
    if (t === 'music') return list.filter(it => (it.text||'').includes('music') || (it.text||'').includes('set_volume'));
    return list;
  }

  async function load() {
    try {
      setLoading(true);
      if (level === 'automation' || level.startsWith('automation:')) {
        const res = await api.logs({ limit: 300, level: 'info' });
        let all = [...(res.items || [])].sort((a,b)=> new Date(a.ts)-new Date(b.ts));
        let filtered = all.filter(it => (it.text||'').startsWith('[AUTOMATION]'));
        if (level.startsWith('automation:')) {
          const subtype = level.split(':')[1];
          filtered = filterAutomationByType(filtered, subtype);
        }
        setItems(filtered);
      } else if (level === 'reminders') { 
        const res = await api.logs({ limit: 300, level: 'info' });
        const all = [...(res.items || [])].sort((a,b)=> new Date(a.ts)-new Date(b.ts));
        const filtered = all.filter(it => (it.text||'').startsWith('[REMINDER]'));
        setItems(filtered);
      } else if (level === 'gpt') {
        const res = await api.logs({ limit: 300, level: 'info' });
        const all = [...(res.items || [])].sort((a,b)=> new Date(a.ts)-new Date(b.ts));
        const filtered = all.filter(it => (it.text||'').startsWith('[GPT]'));
        setItems(filtered);
      } else {
        const res = await api.logs({ limit: 200, level: level === 'all' ? undefined : level });
        const sortedAsc = [...(res.items || [])].sort((a, b) => new Date(a.ts) - new Date(b.ts));
        setItems(sortedAsc);
      }
    } catch (e) {
      // ignore
    } finally { setLoading(false); }
  }

  useEffect(() => {
    load();
    timerRef.current = setInterval(load, 5000);
    return () => clearInterval(timerRef.current);
  }, [level]);

  const filterButtons = ['all','system','user','info','error','automation','automation:lights','automation:climate','automation:music','gpt'];

  return (
    <div className="dashboard-panel">
      <div className="panel-header">
        <h3>Logs</h3>
        <div className="filters">
          {filterButtons.map((l) => (
            <button key={l} className={`chip ${level===l?'active':''}`} onClick={() => setLevel(l)}>{l.toUpperCase()}</button>
          ))}
          <button className="chip" onClick={load}>{loading? '...' : 'REFRESH'}</button>
        </div>
      </div>
      <div className="logs scrollable">
        {items.map(it => (
          <div key={it.id} className={`log-line ${it.level}`}>{it.text}</div>
        ))}
        {!items.length && <div className="hint-line">No logs yet.</div>}
      </div>
    </div>
  );
}
