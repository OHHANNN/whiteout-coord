import { useCallback } from 'react';

import { useLocalStorage } from './useLocalStorage';

const ONBOARDING_KEY = 'whiteout-coord:onboarding-done';

export type OnboardingTour = 'entry' | 'commander' | 'driver' | 'advanced';

/**
 * 引導 hook · 記錄哪些 tour 已經跑過、避免重跳。
 *
 * - 同 tab 切換時靠 useLocalStorage 廣播即時同步（避免結束後另一頁還在跑）
 * - reset() 把所有 flag 清掉（SettingsMenu「重看教學」用）
 */
export function useOnboarding(tour: OnboardingTour): {
  run: boolean;
  markDone: () => void;
  reset: () => void;
} {
  const [done, setDone] = useLocalStorage<OnboardingTour[]>(
    ONBOARDING_KEY,
    []
  );

  const run = !done.includes(tour);

  const markDone = useCallback(() => {
    setDone((prev) =>
      prev.includes(tour) ? prev : [...prev, tour]
    );
  }, [tour, setDone]);

  const reset = useCallback(() => {
    setDone([]);
  }, [setDone]);

  return { run, markDone, reset };
}
