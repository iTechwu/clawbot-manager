/**
 * i18n 模块统一导出
 */

// 配置
export {
  locales,
  defaultLocale,
  localeNames,
  localeFlags,
  namespaces,
  isValidLocale,
  type Locale,
  type Namespace,
} from './config';

// 路由
export { routing } from './routing';

// 导航工具
export {
  Link,
  redirect,
  usePathname,
  useRouter,
  getPathname,
} from './navigation';

// 类型定义
export type { AppMessages } from './types';
