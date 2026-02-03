/**
 * i18n 类型定义
 * 为翻译键提供类型安全
 *
 * 使用方式：
 * import type { TranslationKeys } from '@/i18n/types';
 * const key: TranslationKeys = 'common.actions.save';
 */

import type zhCN from '../locales/zh-CN/common.json';
import type zhCNBots from '../locales/zh-CN/bots.json';
import type zhCNNavigation from '../locales/zh-CN/navigation.json';
import type zhCNForms from '../locales/zh-CN/forms.json';
import type zhCNErrors from '../locales/zh-CN/errors.json';
import type zhCNValidation from '../locales/zh-CN/validation.json';
import type zhCNCreative from '../locales/zh-CN/creative.json';
import type zhCNSettings from '../locales/zh-CN/settings.json';

/**
 * 所有翻译消息的类型定义
 */
export interface AppMessages {
  common: typeof zhCN;
  bots: typeof zhCNBots;
  navigation: typeof zhCNNavigation;
  forms: typeof zhCNForms;
  errors: typeof zhCNErrors;
  validation: typeof zhCNValidation;
  creative: typeof zhCNCreative;
  settings: typeof zhCNSettings;
}

/**
 * 声明 next-intl 的类型
 * 这样 useTranslations() 就能获得类型提示
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace IntlMessages {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface Messages extends AppMessages {}
  }
}

export {};
