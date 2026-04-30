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
 * react-joyride v3 包裝。v3 vs v2 重要差異：
 *   - import { Joyride } 是 named export
 *   - run 預設 false（v2 是 true）→ 必須明確傳 true 才會跑
 *   - callback → onEvent，多一個 controls 第二參數
 *   - 顯示用的設定（showProgress / skipBeacon / 顏色 / zIndex / buttons）
 *     全部搬到 options={{}} prop、不再是 top-level
 *   - showSkipButton 砍掉、改用 options.buttons 陣列加 'skip'
 *   - styles.options 砍掉、theme 顏色改放 options
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
      continuous
      onEvent={handleEvent}
      options={{
        showProgress: true,
        skipBeacon: true,
        buttons: ['back', 'skip', 'primary'],
        // 跟 shadcn theme tokens 對齊
        primaryColor: 'oklch(0.21 0.006 285.885)',
        textColor: 'oklch(0.141 0.005 285.823)',
        backgroundColor: 'oklch(1 0 0)',
        arrowColor: 'oklch(1 0 0)',
        overlayColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 100,
      }}
      locale={{
        back: t('onboarding.back'),
        close: t('onboarding.close'),
        last: t('onboarding.done'),
        next: t('onboarding.next'),
        skip: t('onboarding.skip'),
      }}
    />
  );
}
