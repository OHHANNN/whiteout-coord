import type { Step } from 'react-joyride';
import type { TFunction } from 'i18next';

/**
 * react-joyride v3 Step 配置工廠。
 * 每個 tour 對應 src/hooks/useOnboarding.ts 的 OnboardingTour 字串。
 *
 * target 全部走 `[data-tour="..."]` selector，跟元件裡的 attribute 對應。
 * placement: top / bottom / left / right / center / auto
 *
 * v3 註：disableBeacon 從 step level 移除、改在 <Joyride skipBeacon /> 全域層。
 */

export function getEntrySteps(t: TFunction): Step[] {
  return [
    {
      target: '[data-tour="brand"]',
      title: t('onboarding.entry.1.title'),
      content: t('onboarding.entry.1.body'),
      placement: 'bottom',
    },
    {
      target: '[data-tour="pin-input"]',
      title: t('onboarding.entry.2.title'),
      content: t('onboarding.entry.2.body'),
      placement: 'bottom',
    },
    {
      target: '[data-tour="random-pin"]',
      title: t('onboarding.entry.3.title'),
      content: t('onboarding.entry.3.body'),
      placement: 'top',
    },
    {
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
      target: '[data-tour="pin-badge"]',
      title: t('onboarding.commander.1.title'),
      content: t('onboarding.commander.1.body'),
      placement: 'bottom',
    },
    {
      target: '[data-tour="target-card"]',
      title: t('onboarding.commander.2.title'),
      content: t('onboarding.commander.2.body'),
      placement: 'right',
    },
    {
      target: '[data-tour="time-shortcuts"]',
      title: t('onboarding.commander.3.title'),
      content: t('onboarding.commander.3.body'),
      placement: 'right',
    },
    {
      target: '[data-tour="t-minus"]',
      title: t('onboarding.commander.4.title'),
      content: t('onboarding.commander.4.body'),
      placement: 'right',
    },
    {
      target: '[data-tour="add-driver"]',
      title: t('onboarding.commander.5.title'),
      content: t('onboarding.commander.5.body'),
      placement: 'bottom',
    },
    {
      target: '[data-tour="rallying-checkbox"]',
      title: t('onboarding.commander.6.title'),
      content: t('onboarding.commander.6.body'),
      placement: 'bottom',
    },
    {
      target: '[data-tour="troop-cell"]',
      title: t('onboarding.commander.7.title'),
      content: t('onboarding.commander.7.body'),
      placement: 'top',
    },
    {
      target: '[data-tour="lock-start"]',
      title: t('onboarding.commander.8.title'),
      content: t('onboarding.commander.8.body'),
      placement: 'top',
    },
    {
      target: '[data-tour="settings"]',
      title: t('onboarding.commander.9.title'),
      content: t('onboarding.commander.9.body'),
      placement: 'bottom',
    },
  ];
}

export function getDriverSteps(t: TFunction): Step[] {
  return [
    {
      target: '[data-tour="self-row"]',
      title: t('onboarding.driver.1.title'),
      content: t('onboarding.driver.1.body'),
      placement: 'top',
    },
    {
      target: '[data-tour="until-launch"]',
      title: t('onboarding.driver.2.title'),
      content: t('onboarding.driver.2.body'),
      placement: 'top',
    },
    {
      target: '[data-tour="march-cell"]',
      title: t('onboarding.driver.3.title'),
      content: t('onboarding.driver.3.body'),
      placement: 'top',
    },
    {
      target: '[data-tour="rally-toggle"]',
      title: t('onboarding.driver.4.title'),
      content: t('onboarding.driver.4.body'),
      placement: 'top',
    },
    {
      target: '[data-tour="troop-cell"]',
      title: t('onboarding.driver.5.title'),
      content: t('onboarding.driver.5.body'),
      placement: 'top',
    },
    {
      target: '[data-tour="offset-cell"]',
      title: t('onboarding.driver.6.title'),
      content: t('onboarding.driver.6.body'),
      placement: 'top',
    },
    {
      target: '[data-tour="settings"]',
      title: t('onboarding.driver.7.title'),
      content: t('onboarding.driver.7.body'),
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
      target: '[data-tour="row-actions"]',
      title: t('onboarding.advanced.1.title'),
      content: t('onboarding.advanced.1.body'),
      placement: 'left',
    },
    {
      target: '[data-tour="battle-history"]',
      title: t('onboarding.advanced.2.title'),
      content: t('onboarding.advanced.2.body'),
      placement: 'bottom',
    },
    {
      target: '[data-tour="settings"]',
      title: t('onboarding.advanced.3.title'),
      content: t('onboarding.advanced.3.body'),
      placement: 'bottom',
    },
  ];
}
