// Read global flags from window.__TARS_FLAGS__ with safe defaults
export function getFlags() {
  const w = typeof window !== 'undefined' ? window : {};
  const f = w.__TARS_FLAGS__ || {};
  return {
    AI_DISABLED: !!f.AI_DISABLED,
    VOICE_DISABLED: !!f.VOICE_DISABLED,
    WS_DISABLED: !!f.WS_DISABLED,
    TEST_MODE: !!f.TEST_MODE,
  };
}