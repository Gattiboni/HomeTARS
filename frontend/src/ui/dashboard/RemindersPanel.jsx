import React, { useEffect, useState } from "react";
import { api } from "../../core/api";

export default function RemindersPanel() {
  const [items, setItems] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const res = await fetch(`${(process.env.REACT_APP_BACKEND_URL||'')}/api/reminders`).then(r=>r.json());
      setItems(res.items || []);
    } catch (e) {
      // ignore
    } finally { setLoading(false); }
  }

  async function createReminder() {
    const body = { text };
    if (!text.trim()) return;
    try {
      await fetch(`${(process.env.REACT_APP_BACKEND_URL||'')}/api/reminders`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
      setText("");
      load();
    } catch (e) {}
  }

  async function markDone(id) {
    try {
      await fetch(`${(process.env.REACT_APP_BACKEND_URL||'')}/api/reminders/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status:'done' }) });
      load();
    } catch (e) {}
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="dashboard-panel">
      <div className="panel-header">
        <h3>Reminders</h3>
        <div className="row" style={{gap:8}}>
          <input value={text} onChange={e=> setText(e.target.value)} placeholder="Add a reminder..." style={{minWidth:280}} />
          <button className="chip" onClick={createReminder}>ADD</button>
          <button className="chip" onClick={load}>{loading? '...' : 'REFRESH'}</button>
        </div>
      </div>
      <div className="card" style={{marginTop:12}}>
        <div className="card-body" style={{display:'flex', flexDirection:'column', gap:8}}>
          {items.map(it => (
            <div key={it.id} className="row" style={{display:'flex', justifyContent:'space-between'}}>
              <div>
                <span className={`chip ${it.status==='done'?'active':''}`}>{it.status.toUpperCase()}</span>
                <span style={{marginLeft:8}}>{it.text}</span>
              </div>
              {it.status !== 'done' && <button className="chip" onClick={()=> markDone(it.id)}>MARK DONE</button>}
            </div>
          ))}
          {!items.length && <div className="hint-line">No reminders yet.</div>}
        </div>
      </div>
    </div>
  );
}
