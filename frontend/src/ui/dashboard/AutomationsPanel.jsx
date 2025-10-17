import React, { useEffect, useRef, useState } from "react";
import { api } from "../../core/api";
import DeviceCard from "./DeviceCard";

export default function AutomationsPanel() {
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);

  async function load() {
    try {
      setLoading(true);
      const res = await api.integrations.ha.entities();
      const items = (res.items || []).filter(Boolean);
      // sort by domain then name
      items.sort((a,b)=> (a.domain||'').localeCompare(b.domain||'') || (a.name||'').localeCompare(b.name||''));
      setEntities(items);
    } catch (e) {
      // ignore
    } finally { setLoading(false); }
  }

  useEffect(() => {
    load();
    timerRef.current = setInterval(load, 5000);
    return () => clearInterval(timerRef.current);
  }, []);

  const grouped = entities.reduce((acc, it)=>{ (acc[it.domain] = acc[it.domain] || []).push(it); return acc; }, {});
  const domains = Object.keys(grouped).sort();

  return (
    <div className="dashboard-panel">
      <div className="panel-header">
        <h3>Automations</h3>
        <div className="filters">
          <button className="chip" onClick={load}>{loading? '...' : 'REFRESH'}</button>
          <div className="chip">HA: {entities.length} entities</div>
        </div>
      </div>

      <div className="grid-2">
        {domains.map(dom => (
          <div key={dom} className="card" style={{ gridColumn:'1 / -1' }}>
            <div className="card-title" style={{ textTransform:'capitalize' }}>{dom.replace('_',' ')}</div>
            <div className="card-body" style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12 }}>
              {grouped[dom].map(ent => (
                <DeviceCard key={ent.entity_id} entity={ent} onAfterAction={load} />
              ))}
            </div>
          </div>
        ))}
        {!domains.length && (
          <div className="card" style={{ gridColumn:'1 / -1' }}>
            <div className="card-body">No entities from Home Assistant. Check HA configuration.</div>
          </div>
        )}
      </div>
    </div>
  );
}
