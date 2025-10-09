/*
 HomeTARS Phase 1 — Mock layer
 - Boot sequence messages and timings
 - Local command router with canned responses
 - Kept separate from UI to ease future backend integration
 Visual reference: seguir estética sci-fi minimalista inspirada no TARS de Interstellar (tela preta, texto verde neon, boot sequence animada)
*/

export const BOOT_SEQUENCE = [
  { text: "BOOTING SYSTEM...", delay: 700 },
  { text: "LOADING CORE MODULES...", delay: 900 },
  { text: "CALIBRATING INTERFACES...", delay: 700 },
  { text: "ESTABLISHING CONTROL LINK...", delay: 600 },
  { text: "TARS SYSTEM ONLINE.", delay: 500 },
];

export const COMMANDS = {
  help: {
    type: "system",
    lines: [
      "AVAILABLE COMMANDS:",
      " - help   : list available commands",
      " - status : show system status",
      " - clear  : clear the terminal",
      " - time   : show current system time",
    ],
  },
  status: {
    type: "system",
    lines: ["SYSTEM STATUS: ONLINE / CORE STABLE"],
  },
  clear: {
    type: "action",
    action: "clear",
  },
  time: {
    type: "system",
    resolver: () => [
      `SYSTEM TIME: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`,
    ],
  },
};

export function resolveCommand(inputRaw) {
  const input = (inputRaw || "").trim().toLowerCase();
  if (!input) {
    return { type: "empty", lines: [] };
  }

  if (COMMANDS[input]) {
    const def = COMMANDS[input];
    if (def.type === "action" && def.action === "clear") {
      return { type: "action", action: "clear" };
    }
    if (typeof def.resolver === "function") {
      return { type: def.type, lines: def.resolver() };
    }
    return { type: def.type, lines: def.lines };
  }

  return { type: "error", lines: ["COMMAND NOT RECOGNIZED."] };
}