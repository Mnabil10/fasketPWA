let audioContext: AudioContext | null = null;

export function playNotificationSound() {
  if (typeof window === "undefined") return;
  try {
    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextCtor) return;
    if (!audioContext || audioContext.state === "closed") {
      audioContext = new AudioContextCtor();
    }
    const ctx = audioContext;
    if (ctx.state === "suspended") {
      void ctx.resume();
    }
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.value = 0.12;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.2);
    oscillator.onended = () => {
      gain.disconnect();
      oscillator.disconnect();
    };
  } catch {
    // ignore audio playback errors
  }
}
