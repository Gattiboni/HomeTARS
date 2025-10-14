import React, { useEffect, useState } from "react";
import { Switch } from "../../components/ui/switch";
import { Slider } from "../../components/ui/slider";
import { dispatchIntent } from "../../core/intent";
import { getAutomationState, ROOMS } from "../../core/automation";
import { Play, Pause, SkipForward, SkipBack } from "lucide-react";

// Mock per-room device keys to display order
const ROOM_DEVICES = {
  living: ["ceiling", "floor"],
  bedroom: ["ceiling", "bedside"],
  office: ["desk", "projector"],
  kitchen: ["ceiling"],
};

export default function AutomationsPanel() {
  const [state, setState] = useState(() => getAutomationState());

  useEffect(() => {
    const onChanged = (e) => { setState(e.detail || getAutomationState()); };
    window.addEventListener('tars:automationStateChanged', onChanged);
    setState(getAutomationState());
    return () => window.removeEventListener('tars:automationStateChanged', onChanged);
  }, []);

  const onLightToggle = (room, v) => dispatchIntent({ action: v ? 'lights_on' : 'lights_off', room });
  const onDeviceToggle = (room, target, v) => dispatchIntent({ action: v ? 'device_on' : 'device_off', room, target });
  const onBrightness = (room, v) => dispatchIntent({ action: 'set_brightness', room, value: v[0] });
  const onTemp = (room, v) => dispatchIntent({ action: 'set_temperature', room, value: v[0] });

  const onMusicToggle = (v) => dispatchIntent({ action: v ? 'play_music' : 'stop_music' });
  const onVolume = (v) => dispatchIntent({ action: 'set_volume', value: v[0] });

  const scenes = [
    { id: 'movie', label: 'Movie', acts: [{action:'lights_off'},{action:'set_brightness', value:10},{action:'play_music'}] },
    { id: 'night', label: 'Night', acts: [{action:'lights_off'}] },
    { id: 'away', label: 'Away', acts: [{action:'lights_off'},{action:'stop_music'}] },
    { id: 'focus', label: 'Focus', acts: [{action:'lights_on'},{action:'set_brightness', value:70}] },
    { id: 'chill', label: 'Chill', acts: [{action:'lights_on'},{action:'set_brightness', value:40},{action:'play_music'}] },
  ];

  const runScene = (scene) => {
    scene.acts.forEach(a => dispatchIntent(a));
  };

  const devices = state.devices || {};

  return (
    <div className="dashboard-panel">
      <div className="panel-header"><h3>Automations</h3></div>

      <div className="grid-2">
        {/* Lights per room (with devices) */}
        <div className="card" style={{gridColumn:'1 / -1'}}>
          <div className="card-title">Lights</div>
          <div className="card-body" style={{display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12}}>
            {ROOMS.map((r) => (
              <div key={r} className="card" style={{padding:'8px 10px'}}>
                <div className="card-title" style={{textTransform:'capitalize'}}>{r}</div>
                <div className="card-body row"><span>ON</span><Switch checked={!!state.lights?.[r]} onCheckedChange={(v)=> onLightToggle(r,v)} /></div>
                <div className="card-body" style={{display:'flex', gap:8, flexWrap:'wrap'}}>
                  {(ROOM_DEVICES[r] || Object.keys(devices[r]||{})).map((dev) => (
                    <div key={`${r}-${dev}`} className="row" style={{display:'flex', alignItems:'center', gap:6}}>
                      <span style={{fontSize:12, opacity:0.8}}>{dev}</span>
                      <Switch checked={!!devices?.[r]?.[dev]} onCheckedChange={(v)=> onDeviceToggle(r, dev, v)} />
                    </div>
                  ))}
                </div>
                <div className="card-body">
                  <div className="label">Brightness</div>
                  <Slider value={[state.brightness?.[r] ?? 0]} onValueChange={(v)=> onBrightness(r,v)} min={0} max={100} step={1} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Temperature per room */}
        <div className="card" style={{gridColumn:'1 / -1'}}>
          <div className="card-title">Thermostat</div>
          <div className="card-body" style={{display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12}}>
            {ROOMS.map((r) => (
              <div key={r} className="card" style={{padding:'8px 10px'}}>
                <div className="card-title" style={{textTransform:'capitalize'}}>{r}</div>
                <div className="card-body">
                  <div className="label">Target (°C)</div>
                  <Slider value={[state.temperature?.[r] ?? 22]} onValueChange={(v)=> onTemp(r,v)} min={16} max={30} step={0.5} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Music global */}
        <div className="card">
          <div className="card-title">Music</div>
          <div className="card-body row"><span>ON</span><Switch checked={!!state.music} onCheckedChange={onMusicToggle} /></div>
          <div className="card-body"><div className="label">Volume</div><Slider value={[state.volume ?? 30]} onValueChange={onVolume} min={0} max={100} step={1} /></div>
          <div className="card-body row" style={{gap:12}}>
            <button className="chip"><SkipBack size={14}/></button>
            <button className="chip"><Play size={14}/></button>
            <button className="chip"><Pause size={14}/></button>
            <button className="chip"><SkipForward size={14}/></button>
          </div>
        </div>

        {/* Scenes */}
        <div className="card">
          <div className="card-title">Scenes</div>
          <div className="card-body" style={{display:'flex', flexWrap:'wrap', gap:8}}>
            {scenes.map(s => (
              <button key={s.id} className="chip" onClick={()=> runScene(s)}>{s.label}</button>
            ))}
          </div>
        </div>

        {/* Energy & Weather (mock) */}
        <div className="card" style={{gridColumn:'1 / -1'}}>
          <div className="card-title">Energy</div>
          <div className="card-body">
            <div style={{height:6, background:'rgba(0,255,153,0.15)', borderRadius:6, overflow:'hidden'}}>
              <div style={{width:`${Math.min(100, (Object.values(state.devices||{}).reduce((acc, rooms)=> acc + Object.values(rooms||{}).filter(Boolean).length, 0)*12)+state.volume*0.5)}%`, height:6, background:'rgba(0,255,153,0.5)'}}></div>
            </div>
          </div>
        </div>

        <div className="card" style={{gridColumn:'1 / -1'}}>
          <div className="card-title">Weather</div>
          <div className="card-body" style={{display:'flex', gap:16}}>
            {['Today','+1','+2','+3','+4'].map((d, i)=> (
              <div key={i} className="card" style={{padding:'6px 10px'}}>
                <div className="card-title">{d}</div>
                <div className="card-body">{22 + (i%3)}°C / {15 + (i%2)}°C</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
