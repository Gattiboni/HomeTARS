import React, { useEffect, useState } from "react";
import { Switch } from "../../components/ui/switch";
import { Slider } from "../../components/ui/slider";
import { dispatchIntent } from "../../core/intent";
import { getAutomationState } from "../../core/automation";

export default function AutomationsPanel() {
  const [state, setState] = useState(() => getAutomationState());

  useEffect(() => {
    const onChanged = (e) => { setState(e.detail || getAutomationState()); };
    window.addEventListener('tars:automationStateChanged', onChanged);
    // sync on mount
    setState(getAutomationState());
    return () => window.removeEventListener('tars:automationStateChanged', onChanged);
  }, []);

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