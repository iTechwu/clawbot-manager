/**
 * i18n 路由配置
 * 定义多语言路由规则
 */

import { defineRouting } from 'next-intl/routing';
import { locales, defaultLocale } from './config';

export const routing = defineRouting({
  // 支持的语言列表
  locales,

  // 默认语言
  defaultLocale,

  // 语言前缀策略
  // 'as-needed': 默认语言不显示前缀，其他语言显示
  // 'always': 所有语言都显示前缀
  // 'never': 不显示前缀（不推荐）
  localePrefix: 'as-needed',

  // 语言检测配置
  // 启用后会根据浏览器 Accept-Language 头自动检测语言
  // 中文浏览器会自动匹配到 zh-CN
  localeDetection: true,
});
