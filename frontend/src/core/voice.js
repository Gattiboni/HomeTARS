// frontend/src/core/voice.js (FINAL) — WebM padrão + fallback WAV, slices de 3s, wake payload pass-through
// Requisitos atendidos: cross-browser (Chrome/Edge/Firefox), filename/mime corretos, DoD de STT/TTS.

import { getFlags } from "./flags";

const BASE = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/$/, '');
const API = `${BASE}/api`;

// ===== Helpers WAV (fallback WebAudio) =====
function writeWavHeader(samplesLength, sampleRate) {
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);
  const bytesPerSample = 2; // PCM16
  const blockAlign = 1 * bytesPerSample; // mono
  const byteRate = sampleRate * blockAlign;
  let p = 0;
  const wStr = (s) => { for (let i = 0; i < s.length; i++) view.setUint8(p++, s.charCodeAt(i)); };
  const w32 = (v) => { view.setUint32(p, v, true); p += 4; };
  const w16 = (v) => { view.setUint16(p, v, true); p += 2; };
  wStr('RIFF'); w32(36 + samplesLength * bytesPerSample); wStr('WAVE');
  wStr('fmt '); w32(16); w16(1); w16(1); w32(sampleRate); w32(byteRate); w16(blockAlign); w16(16);
  wStr('data'); w32(samplesLength * bytesPerSample);
  return buffer;
}

function floatTo16BitPCM(float32) {
  const out = new DataView(new ArrayBuffer(float32.length * 2));
  let offset = 0;
  for (let i = 0; i < float32.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, float32[i]));
    out.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return out.buffer;
}

function pickMime() {
  // Prefer opus in webm; test support first
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg'
  ];
  for (const c of candidates) {
    if (window.MediaRecorder?.isTypeSupported?.(c)) return c;
  }
  // As last resort, let MediaRecorder decide, or fall back to WebAudio path
  return '';
}

// ===== Public API =====
export function startMic({ onTranscript, onError, onState }) {
  const flags = getFlags();
  if (flags.VOICE_DISABLED) {
    onState && onState('stopped');
    return { stop: () => {} };
  }

  let stream = null;
  let rec = null;
  let ac = null; // AudioContext (fallback)
  let source = null;
  let processor = null;
  let pcmBuffers = [];
  let pcmLength = 0;
  let lastSend = 0;
  const timeslice = 3000; // 3s para fluidez

  async function sendWavChunk(sampleRate) {
    try {
      if (!pcmLength) return;
      const merged = new Float32Array(pcmLength);
      let offset = 0;
      for (const b of pcmBuffers) { merged.set(b, offset); offset += b.length; }
      pcmBuffers = []; pcmLength = 0;
      const wavHeader = writeWavHeader(merged.length, sampleRate);
      const pcm16 = floatTo16BitPCM(merged);
      const wavBlob = new Blob([wavHeader, pcm16], { type: 'audio/wav' });
      const fd = new FormData();
      fd.append('file', wavBlob, 'clip.wav');
      const res = await fetch(`${API}/voice/transcribe`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error(`transcribe ${res.status}`);
      const data = await res.json();
      onTranscript && onTranscript(data || {}); // data: { text, language, wake, command_text }
    } catch (err) {
      onError && onError(err);
    }
  }

  function beginMediaRecorder(mimeType) {
    rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    rec.ondataavailable = async (e) => {
      try {
        if (!e.data || e.data.size < 1024) return; // ignora lixo
        // Arquivo SEMPRE com extensão e mimetype corretos
        const file = new File([e.data], 'clip.webm', { type: 'audio/webm' });
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch(`${API}/voice/transcribe`, { method: 'POST', body: fd });
        if (!res.ok) throw new Error(`transcribe ${res.status}`);
        const data = await res.json();
        onTranscript && onTranscript(data || {});
      } catch (err) {
        onError && onError(err);
      }
    };
    rec.start(timeslice);
    onState && onState('active');
  }

  async function beginWebAudio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) throw new Error('AudioContext not available');
    ac = new AC();
    try { if (ac.state === 'suspended') await ac.resume(); } catch (_) {}
    source = ac.createMediaStreamSource(stream);
    processor = ac.createScriptProcessor(4096, 1, 1);
    source.connect(processor); processor.connect(ac.destination);
    lastSend = performance.now();
    processor.onaudioprocess = async (e) => {
      try {
        const now = performance.now();
        const input = e.inputBuffer.getChannelData(0);
        // copia o buffer porque o AudioBuffer é reutilizado
        pcmBuffers.push(new Float32Array(input));
        pcmLength += input.length;
        if (now - lastSend >= timeslice) {
          lastSend = now; await sendWavChunk(ac.sampleRate);
        }
      } catch (err) { onError && onError(err); }
    };
    onState && onState('active');
  }

  const begin = async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = pickMime();
      if (window.MediaRecorder && (mime || window.MediaRecorder.isTypeSupported?.('audio/webm') || window.MediaRecorder.isTypeSupported?.('audio/ogg'))) {
        beginMediaRecorder(mime);
      } else {
        await beginWebAudio();
      }
    } catch (err) {
      // iOS/Safari exigem gesto prévio
      try {
        onState && onState('awaiting_gesture');
        const once = () => { window.removeEventListener('click', once); begin(); };
        window.addEventListener('click', once, { once: true });
      } catch (_) {}
      onError && onError(err);
    }
  };

  begin();

  return {
    stop: () => {
      try { rec && rec.stop(); } catch (_) {}
      try { stream && stream.getTracks().forEach(t => t.stop()); } catch (_) {}
      try { processor && processor.disconnect(); } catch (_) {}
      try { source && source.disconnect(); } catch (_) {}
      try { ac && ac.close(); } catch (_) {}
      onState && onState('stopped');
    }
  };
}

export async function speak(text, { voice = 'alloy', fmt = 'mp3' } = {}) {
  const flags = getFlags();
  if (flags.VOICE_DISABLED) return; // sem TTS quando desligado
  const fd = new FormData();
  fd.append('text', text);
  fd.append('voice', voice);
  fd.append('fmt', fmt);
  const res = await fetch(`${API}/voice/tts`, { method: 'POST', body: fd });
  if (!res.ok) throw new Error(`tts ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  await audio.play();
}
