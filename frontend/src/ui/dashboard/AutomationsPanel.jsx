import React, { useEffect, useState } from "react";
import { Switch } from "../../components/ui/switch";
import { Slider } from "../../components/ui/slider";
import { dispatchIntent } from "../../core/intent";

function clamp(n, a, b) { return Math.min(b, Math.max(a, n)); }

export default function AutomationsPanel() {
  const [state, setState] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tars_automations')) || { light: false, brightness: 40, temp: 22, music: false, volume: 30 }; }
    catch { return { light: false, brightness: 40, temp: 22, music: false, volume: 30 }; }
  });

  useEffect(() => { localStorage.setItem('tars_automations', JSON.stringify(state)); }, [state]);

  useEffect(() => {
    const onIntent = (e) => {
      const intent = e.detail || {};
      if (!intent || !intent.action) return;
      setState((s) => {
        const next = { ...s };
        switch (intent.action) {
          case 'lights_on':
            next.light = true; if (next.brightness <= 0) next.brightness = 40; break;
          case 'lights_off':
            next.light = false; break;
          case 'set_brightness':
          case 'dim_lights':
            if (typeof intent.value === 'number') next.brightness = clamp(Math.round(intent.value), 0, 100);
            else next.brightness = 30; break;
          case 'set_temperature':
            if (typeof intent.value === 'number') next.temp = clamp(Number(intent.value), 16, 30); break;
          case 'play_music':
            next.music = true; break;
          case 'stop_music':
            next.music = false; break;
          case 'set_volume':
            if (typeof intent.value === 'number') next.volume = clamp(Math.round(intent.value), 0, 100); break;
          default:
            return s;
        }
        return next;
      });
    };
    window.addEventListener('tars:automationCommand', onIntent);
    return () => window.removeEventListener('tars:automationCommand', onIntent);
  }, []);

  // Dispatch from UI interactions; state update is driven by listener to keep single source-of-truth
  const onLightToggle = (v) => dispatchIntent({ action: v ? 'lights_on' : 'lights_off' });
  const onBrightness = (v) => dispatchIntent({ action: 'set_brightness', value: v[0] });
  const onTemp = (v) => dispatchIntent({ action: 'set_temperature', value: v[0] });
  const onMusic = (v) => dispatchIntent({ action: v ? 'play_music' : 'stop_music' });
  const onVolume = (v) => dispatchIntent({ action: 'set_volume', value: v[0] });

  return (
    <div className="dashboard-panel">
      <div className="panel-header"><h3>Automations</h3></div>
      <div className="grid-2">
        <div className="card">
          <div className="card-title">Lights</div>
          <div className="card-body row">
            <span>ON</span>
            <Switch checked={state.light} onCheckedChange={onLightToggle} />
          </div>
          <div className="card-body">
            <div className="label">Brightness</div>
            <Slider value={[state.brightness]} onValueChange={onBrightness} min={0} max={100} step={1} />
          </div>
        </div>
        <div className="card">
          <div className="card-title">Thermostat</div>
          <div className="card-body">
            <div className="label">Target</div>
            <Slider value={[state.temp]} onValueChange={onTemp} min={16} max={30} step={0.5} />
          </div>
        </div>
        <div className="card">
          <div className="card-title">Music</div>
          <div className="card-body row">
            <span>ON</span>
            <Switch checked={state.music} onCheckedChange={onMusic} />
          </div>
          <div className="card-body">
            <div className="label">Volume</div>
            <Slider value={[state.volume]} onValueChange={onVolume} min={0} max={100} step={1} />
          </div>
        </div>
      </div>
    </div>
  );
}