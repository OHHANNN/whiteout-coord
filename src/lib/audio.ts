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
    // 不在這裡呼叫 ctx.resume()：beep 從 setInterval / event listener 觸發、
    // 不在 user gesture 內、resume() 會被 Chrome 擋下並噴 console warning
    // (The AudioContext was not allowed to start...)
    // unlockAudio() 會在下次 user 互動時重新開啟、靜默跳過這次嗶聲就好
    logWarn('audio · beep skipped: ctx state =', ctx.state);
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
 * 倒數提示音（發車 / 抵達共用）。
 * - secondsOut > 0：短促高音 (880 Hz, 120ms)
 * - secondsOut === 0：到點！較低音 (440 Hz, 400ms) + 震動
 */
export function countdownBeep(secondsOut: number): void {
  if (secondsOut === 0) {
    beep(440, 0.4, 0.55);
    vibrate([200, 80, 200]);
  } else {
    beep(880, 0.12, 0.35);
  }
}
