import React, { useEffect, useState } from "react";
import { Switch } from "../../components/ui/switch";
import { Slider } from "../../components/ui/slider";

function DeviceCard({ device, onToggle, onAdjust }) {
  const { entity_id, name, state, attributes } = device;
  const type = entity_id.split(".")[0];

  return (
    <div className="card" style={{ padding: "10px", minWidth: 250 }}>
      <div className="card-title" style={{ textTransform: "capitalize" }}>{name || entity_id}</div>
      <div className="card-body row" style={{ alignItems: "center", gap: 8 }}>
        <span>{state}</span>
        {(type === "light" || type === "switch" || type === "climate" || type === "media_player") && (
          <Switch checked={state === "on"} onCheckedChange={(v) => onToggle(device, v)} />
        )}
      </div>

      {attributes && Object.entries(attributes).map(([key, value]) => {
        if (typeof value === "number" && (key.includes("brightness") || key.includes("volume") || key.includes("temperature") || key.includes("color_temp"))) {
          const min = 0;
          const max = key.includes("brightness") ? 255 : key.includes("volume") ? 100 : key.includes("color_temp") ? 500 : 40;
          return (
            <div key={key} className="card-body">
              <div className="label">{key}</div>
              <Slider
                value={[Number(value)]}
                onValueChange={(v) => onAdjust(device, key, v[0])}
                min={min}
                max={max}
                step={1}
              />
            </div>
          );
        }
        return (
          <div key={key} className="card-body" style={{ fontSize: 13, opacity: 0.9 }}>
            <strong>{key}:</strong> {String(value)}
          </div>
        );
      })}
    </div>
  );
}

export default function AutomationsPanel() {
  const [devices, setDevices] = useState([]);

  async function fetchEntities() {
    try {
      const res = await fetch("http://localhost:8000/api/integrations/ha/entities");
      const data = await res.json();
      setDevices(data.items || []);
    } catch (e) {
      console.error("Erro ao buscar entidades do Home Assistant:", e);
    }
  }

  useEffect(() => {
    fetchEntities();
    const interval = setInterval(fetchEntities, 5000);
    return () => clearInterval(interval);
  }, []);

  const onToggle = async (device, value) => {
    const type = device.entity_id.split(".")[0];
    try {
      await fetch("http://localhost:8000/api/integrations/ha/service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: type,
          service: value ? "turn_on" : "turn_off",
          entity_id: device.entity_id,
        }),
      });
      fetchEntities();
    } catch (err) {
      console.error("Erro ao alternar dispositivo:", err);
    }
  };

  const onAdjust = async (device, attribute, value) => {
    const type = device.entity_id.split(".")[0];
    try {
      await fetch("http://localhost:8000/api/integrations/ha/service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: type,
          service: "set_attributes",
          entity_id: device.entity_id,
          attribute,
          value,
        }),
      });
      fetchEntities();
    } catch (err) {
      console.error("Erro ao ajustar atributo:", err);
    }
  };

  return (
    <div className="dashboard-panel">
      <div className="panel-header"><h3>Automations</h3></div>
      <div className="grid-2">
        {devices.map((device) => (
          <DeviceCard key={device.entity_id} device={device} onToggle={onToggle} onAdjust={onAdjust} />
        ))}
      </div>
    </div>
  );
}