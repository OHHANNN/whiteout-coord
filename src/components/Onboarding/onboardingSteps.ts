import type { Step } from 'react-joyride';
import type { TFunction } from 'i18next';

/**
 * react-joyride Step 配置工廠。
 * 每個 tour 對應 src/hooks/useOnboarding.ts 的 OnboardingTour 字串。
 *
 * target 全部走 `[data-tour="..."]` selector，跟元件裡的 attribute 對應。
 * 元件裡需要先補上對應 data-tour="..." 才會有目標可指。
 *
 * placement: 預設 auto（Joyride 自動找空間），需要強制方向再傳。
 * disableBeacon: true → 跳過小水滴提示、直接顯示 tooltip（first step 都這樣）。
 */

const sharedFlags: Pick<Step, 'disableBeacon'> = {
  disableBeacon: true,
};

export function getEntrySteps(t: TFunction): Step[] {
  return [
    {
      ...sharedFlags,
      target: '[data-tour="brand"]',
      title: t('onboarding.entry.1.title'),
      content: t('onboarding.entry.1.body'),
      placement: 'bottom',
    },
    {
      ...sharedFlags,
      target: '[data-tour="pin-input"]',
      title: t('onboarding.entry.2.title'),
      content: t('onboarding.entry.2.body'),
      placement: 'bottom',
    },
    {
      ...sharedFlags,
      target: '[data-tour="random-pin"]',
      title: t('onboarding.entry.3.title'),
      content: t('onboarding.entry.3.body'),
      placement: 'top',
    },
    {
      ...sharedFlags,
      target: '[data-tour="enter-room"]',
      title: t('onboarding.entry.4.title'),
      content: t('onboarding.entry.4.body'),
      placement: 'top',
    },
  ];
}

export function getCommanderSteps(t: TFunction): Step[] {
  return [
    {
      ...sharedFlags,
      target: '[data-tour="pin-badge"]',
      title: t('onboarding.commander.1.title'),
      content: t('onboarding.commander.1.body'),
      placement: 'bottom',
    },
    {
      ...sharedFlags,
      target: '[data-tour="target-card"]',
      title: t('onboarding.commander.2.title'),
      content: t('onboarding.commander.2.body'),
      placement: 'right',
    },
    {
      ...sharedFlags,
      target: '[data-tour="time-shortcuts"]',
      title: t('onboarding.commander.3.title'),
      content: t('onboarding.commander.3.body'),
      placement: 'right',
    },
    {
      ...sharedFlags,
      target: '[data-tour="t-minus"]',
      title: t('onboarding.commander.4.title'),
      content: t('onboarding.commander.4.body'),
      placement: 'right',
    },
    {
      ...sharedFlags,
      target: '[data-tour="add-driver"]',
      title: t('onboarding.commander.5.title'),
      content: t('onboarding.commander.5.body'),
      placement: 'bottom',
    },
    {
      ...sharedFlags,
      target: '[data-tour="rallying-checkbox"]',
      title: t('onboarding.commander.6.title'),
      content: t('onboarding.commander.6.body'),
      placement: 'bottom',
    },
    {
      ...sharedFlags,
      target: '[data-tour="lock-start"]',
      title: t('onboarding.commander.7.title'),
      content: t('onboarding.commander.7.body'),
      placement: 'top',
    },
    {
      ...sharedFlags,
      target: '[data-tour="settings"]',
      title: t('onboarding.commander.8.title'),
      content: t('onboarding.commander.8.body'),
      placement: 'bottom',
    },
  ];
}

export function getDriverSteps(t: TFunction): Step[] {
  return [
    {
      ...sharedFlags,
      target: '[data-tour="self-row"]',
      title: t('onboarding.driver.1.title'),
      content: t('onboarding.driver.1.body'),
      placement: 'top',
    },
    {
      ...sharedFlags,
      target: '[data-tour="until-launch"]',
      title: t('onboarding.driver.2.title'),
      content: t('onboarding.driver.2.body'),
      placement: 'top',
    },
    {
      ...sharedFlags,
      target: '[data-tour="march-cell"]',
      title: t('onboarding.driver.3.title'),
      content: t('onboarding.driver.3.body'),
      placement: 'top',
    },
    {
      ...sharedFlags,
      target: '[data-tour="rally-toggle"]',
      title: t('onboarding.driver.4.title'),
      content: t('onboarding.driver.4.body'),
      placement: 'top',
    },
    {
      ...sharedFlags,
      target: '[data-tour="offset-cell"]',
      title: t('onboarding.driver.5.title'),
      content: t('onboarding.driver.5.body'),
      placement: 'top',
    },
    {
      ...sharedFlags,
      target: '[data-tour="settings"]',
      title: t('onboarding.driver.6.title'),
      content: t('onboarding.driver.6.body'),
      placement: 'bottom',
    },
  ];
}

/**
 * 進階教學 · 不在第一次自動跳，使用者從 SettingsMenu 自己叫出來。
 */
export function getAdvancedSteps(t: TFunction): Step[] {
  return [
    {
      ...sharedFlags,
      target: '[data-tour="row-actions"]',
      title: t('onboarding.advanced.1.title'),
      content: t('onboarding.advanced.1.body'),
      placement: 'left',
    },
    {
      ...sharedFlags,
      target: '[data-tour="battle-history"]',
      title: t('onboarding.advanced.2.title'),
      content: t('onboarding.advanced.2.body'),
      placement: 'bottom',
    },
    {
      ...sharedFlags,
      target: '[data-tour="settings"]',
      title: t('onboarding.advanced.3.title'),
      content: t('onboarding.advanced.3.body'),
      placement: 'bottom',
    },
  ];
}
