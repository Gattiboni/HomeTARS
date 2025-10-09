import React, { useEffect, useRef, useState } from "react";
import { api } from "../../core/api";

export default function LogsPanel() {
  const [items, setItems] = useState([]);
  const [level, setLevel] = useState("all");
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);

  async function load() {
    try {
      setLoading(true);
      const res = await api.logs({ limit: 200, level: level === 'all' ? undefined : level });
      const sortedAsc = [...(res.items || [])].sort((a, b) => new Date(a.ts) - new Date(b.ts));
      setItems(sortedAsc);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    timerRef.current = setInterval(load, 5000);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  return (
    <div className="dashboard-panel">
      <div className="panel-header">
        <h3>Logs</h3>
        <div className="filters">
          {['all','system','user','info','error'].map((l) => (
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