import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Joyride,
  STATUS,
  type EventData,
  type Step,
} from 'react-joyride';

import { useOnboarding, type OnboardingTour } from '@/hooks/useOnboarding';

import {
  getAdvancedSteps,
  getCommanderSteps,
  getDriverSteps,
  getEntrySteps,
} from './onboardingSteps';

interface OnboardingProps {
  tour: OnboardingTour;
  /**
   * 強制啟動：不看 localStorage flag、SettingsMenu「重看教學」用。
   * 完成後不會 markDone（讓 user 之後重看也能再啟動）。
   */
  forceRun?: boolean;
  /**
   * 強制 run 模式專用：tour 結束時呼叫（讓父元件清掉 forceRun state）。
   */
  onForceFinish?: () => void;
}

/**
 * react-joyride v3 包一層 · v3 改動：
 *   - named export `Joyride`（v2 是 default）
 *   - 用 `onEvent` callback 不是 `callback`
 *   - `skipBeacon` 從 step level 改到 Options 全域
 *   - styles 直接 inline 在 props（primaryColor / textColor 等）
 */
export function Onboarding({ tour, forceRun, onForceFinish }: OnboardingProps) {
  const { t } = useTranslation();
  const { run: shouldAutoRun, markDone } = useOnboarding(tour);
  const run = forceRun ?? shouldAutoRun;

  const steps: Step[] = useMemo(() => {
    switch (tour) {
      case 'entry':
        return getEntrySteps(t);
      case 'commander':
        return getCommanderSteps(t);
      case 'driver':
        return getDriverSteps(t);
      case 'advanced':
        return getAdvancedSteps(t);
    }
  }, [tour, t]);

  const handleEvent = (data: EventData) => {
    if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) {
      if (forceRun) {
        onForceFinish?.();
      } else {
        markDone();
      }
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      onEvent={handleEvent}
      continuous
      showProgress
      showSkipButton
      skipBeacon
      locale={{
        back: t('onboarding.back'),
        close: t('onboarding.close'),
        last: t('onboarding.done'),
        next: t('onboarding.next'),
        skip: t('onboarding.skip'),
      }}
      primaryColor="oklch(0.21 0.006 285.885)"
      textColor="oklch(0.141 0.005 285.823)"
      backgroundColor="oklch(1 0 0)"
      arrowColor="oklch(1 0 0)"
      overlayColor="rgba(0, 0, 0, 0.5)"
      zIndex={100}
    />
  );
}
