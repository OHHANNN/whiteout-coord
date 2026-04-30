import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Joyride, {
  type CallBackProps,
  STATUS,
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
 * react-joyride 包一層、把 tour 配置 + 完成判斷一次處理掉。
 * Pages 只要：<Onboarding tour="commander" />
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

  const handleCallback = (data: CallBackProps) => {
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
      callback={handleCallback}
      continuous
      showProgress
      showSkipButton
      disableScrolling={false}
      scrollOffset={100}
      locale={{
        back: t('onboarding.back'),
        close: t('onboarding.close'),
        last: t('onboarding.done'),
        next: t('onboarding.next'),
        skip: t('onboarding.skip'),
      }}
      styles={{
        options: {
          // 跟 shadcn theme tokens 對齊
          primaryColor: 'oklch(0.21 0.006 285.885)', // primary
          textColor: 'oklch(0.141 0.005 285.823)', // foreground
          backgroundColor: 'oklch(1 0 0)', // background
          arrowColor: 'oklch(1 0 0)',
          overlayColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 100,
        },
        tooltip: {
          borderRadius: 8,
          padding: 16,
        },
        tooltipTitle: {
          fontSize: 16,
          fontWeight: 600,
        },
        tooltipContent: {
          fontSize: 14,
          padding: '8px 0',
          lineHeight: 1.5,
        },
        buttonNext: {
          borderRadius: 6,
          fontSize: 14,
        },
        buttonBack: {
          fontSize: 14,
        },
        buttonSkip: {
          fontSize: 14,
        },
      }}
    />
  );
}
