// Voice utilities (cross-browser) — STT Whisper via backend, TTS via backend
import { getFlags } from "./flags";

const BASE = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/$/, '');
const API = `${BASE}/api`;

function pickMime() {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/wav'
  ];
  for (const t of types) {
    if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) return t;
  }
  return '';
}

export function startMic({ onTranscript, onError, onState }) {
  const flags = getFlags();
  if (flags.VOICE_DISABLED) {
    onState && onState('stopped');
    return { stop: () => {} };
  }

  let stream = null;
  let rec = null;
  let timeslice = 2500; // 2.5s chunks for lower latency and stability

  const begin = async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      onState && onState('active');
      const mimeType = pickMime();
      const opts = mimeType ? { mimeType } : undefined;
      rec = new MediaRecorder(stream, opts);
      rec.ondataavailable = async (e) => {
        try {
          if (!e.data || e.data.size < 512) return;
          const fd = new FormData();
          const blob = new Blob([e.data], { type: e.data.type || mimeType || 'application/octet-stream' });
          // Some browsers don't support File constructor reliably; backend only needs field name
          fd.append('file', blob, 'clip');
          const res = await fetch(`${API}/voice/transcribe`, { method: 'POST', body: fd });
          if (!res.ok) throw new Error(`transcribe ${res.status}`);
          const data = await res.json();
          // Always call onTranscript to drive wake/armed handling
          onTranscript && onTranscript(data || {});
        } catch (err) {
          onError && onError(err);
        }
      };
      rec.start(timeslice);
    } catch (err) {
      onState && onState('denied');
      onError && onError(err);
    }
  };

  begin();

  return {
    stop: () => {
      try { rec && rec.stop(); } catch (_) {}
      try { stream && stream.getTracks().forEach(t => t.stop()); } catch (_) {}
      onState && onState('stopped');
    },
  };
}

export async function speak(text, { voice = 'alloy', fmt = 'mp3' } = {}) {
  const flags = getFlags();
  if (flags.VOICE_DISABLED) return;
  const fd = new FormData();
  fd.append('text', text || '');
  fd.append('voice', voice);
  fd.append('fmt', fmt);
  const res = await fetch(`${API}/voice/tts`, { method: 'POST', body: fd });
  if (!res.ok) throw new Error(`tts ${res.status}`);
  const data = await res.json();
  const mime = fmt === 'mp3' ? 'mpeg' : fmt;
  const audio = new Audio(`data:audio/${mime};base64,${data.audio_base64}`);
  try { await audio.play(); } catch (e) { /* ignored */ }
}
