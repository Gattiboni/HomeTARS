import React, { useMemo, useRef, useState } from "react";
import { Switch } from "../../components/ui/switch";
import { Slider } from "../../components/ui/slider";
import { api } from "../../core/api";

function AttrList({ attrs }) {
  const entries = Object.entries(attrs || {});
  if (!entries.length) return null;
  return (
    <div className="card-body" style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0,1fr))', gap:6 }}>
      {entries.map(([k, v]) => (
        <div key={k} style={{ fontSize:12, opacity:0.9 }}>
          <strong style={{ opacity:0.8 }}>{k}:</strong> {Array.isArray(v) ? v.join(', ') : (typeof v === 'object' ? JSON.stringify(v) : String(v))}
        </div>
      ))}
    </div>
  );
}

export default function DeviceCard({ entity, onAfterAction }) {
  const { entity_id, domain, name, state, attributes } = entity;
  const [busy, setBusy] = useState(false);
  const volTimer = useRef(null);
  const brightTimer = useRef(null);
  const hvacTimer = useRef(null);

  const title = `${name || entity_id}`;

  async function call(domain, service, data) {
    try {
      setBusy(true);
      await api.integrations.ha.service(domain, service, entity_id, data || {});
      onAfterAction && onAfterAction();
    } catch (e) {
      // ignore
    } finally { setBusy(false); }
  }

  // domain-specific controls
  const Controls = useMemo(() => {
    if (domain === 'light') {
      const on = state !== 'off' && state !== 'unavailable';
      const brightness = attributes?.brightness != null ? Math.round((attributes.brightness / 255) * 100) : undefined;
      const hasBrightness = brightness != null;
      const onToggle = (v) => call('light', v ? 'turn_on' : 'turn_off');
      const onBright = (v) => {
        const pct = v?.[0] ?? 0;
        if (brightTimer.current) clearTimeout(brightTimer.current);
        brightTimer.current = setTimeout(() => call('light', 'turn_on', { brightness_pct: pct }), 300);
      };
      return (
        <>
          <div className="card-body row"><span>ON</span><Switch disabled={busy} checked={!!on} onCheckedChange={onToggle} /></div>
          {hasBrightness && (
            <div className="card-body">
              <div className="label">Brightness</div>
              <Slider defaultValue={[brightness]} onValueChange={onBright} min={0} max={100} step={1} />
            </div>
          )}
        </>
      );
    }
    if (domain === 'switch') {
      const on = state === 'on';
      const onToggle = (v) => call('switch', v ? 'turn_on' : 'turn_off');
      return (
        <div className="card-body row"><span>ON</span><Switch disabled={busy} checked={!!on} onCheckedChange={onToggle} /></div>
      );
    }
    if (domain === 'climate') {
      const target = attributes?.temperature ?? attributes?.target_temp ?? 22;
      const modes = attributes?.hvac_modes || [];
      const mode = state; // HA climate state often equals current hvac_mode
      const setTemp = (v) => {
        const t = v?.[0] ?? target;
        if (hvacTimer.current) clearTimeout(hvacTimer.current);
        hvacTimer.current = setTimeout(() => call('climate', 'set_temperature', { temperature: t }), 200);
      };
      const setMode = (m) => call('climate', 'set_hvac_mode', { hvac_mode: m });
      return (
        <>
          <div className="card-body">
            <div className="label">Target (°C)</div>
            <Slider defaultValue={[Number(target)]} min={10} max={35} step={0.5} onValueChange={setTemp} />
          </div>
          {!!modes.length && (
            <div className="card-body" style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {modes.map((m) => (
                <button key={m} className={`chip ${m===mode?'active':''}`} onClick={()=> setMode(m)}>{m}</button>
              ))}
            </div>
          )}
        </>
      );
    }
    if (domain === 'media_player') {
      const vol = attributes?.volume_level != null ? Math.round((attributes.volume_level) * 100) : undefined;
      const hasVol = vol != null;
      const togglePlay = () => call('media_player', 'media_play_pause');
      const setVol = (v) => {
        const pct = (v?.[0] ?? vol) / 100;
        if (volTimer.current) clearTimeout(volTimer.current);
        volTimer.current = setTimeout(() => call('media_player', 'volume_set', { volume_level: pct }), 200);
      };
      return (
        <>
          <div className="card-body row" style={{ gap:8 }}>
            <button className="chip" onClick={togglePlay}>PLAY/PAUSE</button>
          </div>
          {hasVol && (
            <div className="card-body">
              <div className="label">Volume</div>
              <Slider defaultValue={[vol]} min={0} max={100} step={1} onValueChange={setVol} />
            </div>
          )}
        </>
      );
    }
    // sensor or others: read-only
    return null;
  }, [domain, state, attributes, busy]);

  return (
    <div className="card" style={{ padding:'8px 10px' }}>
      <div className="card-title" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span>{title}</span>
        <span style={{ fontSize:11, opacity:0.7 }}>{entity_id}</span>
      </div>
      <div className="card-body" style={{ display:'flex', gap:12, alignItems:'center' }}>
        <div className={`chip ${state==='on'?'active':''}`}>{String(state).toUpperCase()}</div>
        <div className="chip" style={{ opacity:0.8 }}>{domain}</div>
        {busy && <div className="chip">WORKING…</div>}
      </div>
      {Controls}
      <AttrList attrs={attributes} />
    </div>
  );
}
