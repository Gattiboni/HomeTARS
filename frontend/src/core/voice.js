// Phase 5 Voice utilities with wake word
// Endpoints:
//   POST /api/voice/transcribe (multipart file) -> { text, language, wake, command_text }
//   POST /api/ai { prompt }
//   POST /api/voice/tts (form: text, voice, fmt)

const BASE = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/$/, '');
const API = `${BASE}/api`;

export function startMic({ onTranscript, onError, onState }) {
  let stream = null;
  let rec = null;

  const begin = async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      onState && onState('active');
      rec = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      rec.ondataavailable = async (e) => {
        if (!e.data || e.data.size < 1024) return;
        const fd = new FormData();
        const file = new File([e.data], 'clip.webm', { type: 'audio/webm' });
        fd.append('file', file);
        try {
          const res = await fetch(`${API}/voice/transcribe`, { method: 'POST', body: fd });
          if (!res.ok) throw new Error(`transcribe ${res.status}`);
          const data = await res.json();
          onTranscript && onTranscript(data);
        } catch (err) {
          onError && onError(err);
        }
      };
      rec.start(3000); // 3s slices
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
  const fd = new FormData();
  fd.append('text', text);
  fd.append('voice', voice);
  fd.append('fmt', fmt);
  const res = await fetch(`${API}/voice/tts`, { method: 'POST', body: fd });
  if (!res.ok) throw new Error(`tts ${res.status}`);
  const data = await res.json();
  const audio = new Audio(`data:audio/${fmt === 'mp3' ? 'mpeg' : fmt};base64,${data.audio_base64}`);
  audio.play().catch(() => {});
}