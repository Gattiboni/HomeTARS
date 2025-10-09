import React, { useEffect, useState } from "react";
import { Switch } from "../../components/ui/switch";
import { Slider } from "../../components/ui/slider";

export default function AutomationsPanel() {
  const [state, setState] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tars_automations')) || { light: false, brightness: 40, temp: 22, music: false, volume: 30 }; }
    catch { return { light: false, brightness: 40, temp: 22, music: false, volume: 30 }; }
  });

  useEffect(() => {
    localStorage.setItem('tars_automations', JSON.stringify(state));
  }, [state]);

  return (
    <div className="dashboard-panel">
      <div className="panel-header"><h3>Automations</h3></div>
      <div className="grid-2">
        <div className="card">
          <div className="card-title">Lights</div>
          <div className="card-body row">
            <span>ON</span>
            <Switch checked={state.light} onCheckedChange={(v)=> setState(s=>({...s, light:v}))} />
          </div>
          <div className="card-body">
            <div className="label">Brightness</div>
            <Slider value={[state.brightness]} onValueChange={(v)=> setState(s=>({...s, brightness:v[0]}))} min={0} max={100} step={1} />
          </div>
        </div>
        <div className="card">
          <div className="card-title">Thermostat</div>
          <div className="card-body">
            <div className="label">Target</div>
            <Slider value={[state.temp]} onValueChange={(v)=> setState(s=>({...s, temp:v[0]}))} min={16} max={30} step={0.5} />
          </div>
        </div>
        <div className="card">
          <div className="card-title">Music</div>
          <div className="card-body row">
            <span>ON</span>
            <Switch checked={state.music} onCheckedChange={(v)=> setState(s=>({...s, music:v}))} />
          </div>
          <div className="card-body">
            <div className="label">Volume</div>
            <Slider value={[state.volume]} onValueChange={(v)=> setState(s=>({...s, volume:v[0]}))} min={0} max={100} step={1} />
          </div>
        </div>
      </div>
    </div>
  );
}