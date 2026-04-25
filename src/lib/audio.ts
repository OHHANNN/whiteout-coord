/**
 * Web Audio + Vibration 封裝。
 * 瀏覽器 autoplay policy 會擋住沒經過使用者互動的 AudioContext，
 * 所以第一次使用者點擊時要呼叫 unlockAudio() 一次。
 */
import { logInfo, logWarn } from './logger';

type ACCtor = typeof AudioContext;
const ACtor: ACCtor | undefined =
  typeof window !== 'undefined'
    ? window.AudioContext ||
      (window as unknown as { webkitAudioContext?: ACCtor }).webkitAudioContext
    : undefined;

let ctx: AudioContext | null = null;
let unlocked = false;

export function unlockAudio(): void {
  if (!ACtor) {
    logWarn('audio · AudioContext not supported');
    return;
  }
  if (!ctx) {
    ctx = new ACtor();
  }
  if (ctx.state === 'suspended') {
    ctx
      .resume()
      .then(() => {
        unlocked = true;
        logInfo('audio · unlocked');
      })
      .catch((err) => logWarn('audio · resume failed', err));
  } else {
    unlocked = true;
  }
}

export function isAudioReady(): boolean {
  return unlocked && ctx !== null && ctx.state === 'running';
}

/**
 * 合成一聲 sine wave beep。
 * @param freq  頻率 Hz
 * @param duration 秒
 * @param volume 0~1
 */
export function beep(freq: number, duration = 0.15, volume = 0.35): void {
  if (!ctx) {
    logWarn('audio · beep skipped: AudioContext not initialized (need user interaction first)');
    return;
  }
  if (ctx.state !== 'running') {
    logWarn('audio · beep skipped: ctx state =', ctx.state);
    // 嘗試自救：再 resume 一次（某些瀏覽器一旦 inactive 會 suspend）
    ctx.resume().catch(() => undefined);
    return;
  }

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.value = freq;

  // Attack / decay envelope 避免 click pop
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.01);
  gain.gain.linearRampToValueAtTime(0, now + duration);

  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration);

  logInfo('audio · beep', `${freq}Hz ${Math.round(duration * 1000)}ms`);
}

export function vibrate(pattern: number | number[]): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}

/**
 * 發車倒數提示音。
 * - secondsOut > 0：短促高音 (880 Hz, 120ms)
 * - secondsOut === 0：發車！較低音 (440 Hz, 400ms) + 震動
 */
export function launchAlert(secondsOut: number): void {
  if (secondsOut === 0) {
    beep(440, 0.4, 0.55);
    vibrate([200, 80, 200]);
  } else {
    beep(880, 0.12, 0.35);
  }
}
