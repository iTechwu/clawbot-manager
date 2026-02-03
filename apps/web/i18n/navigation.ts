/**
 * 国际化导航工具
 * 提供支持多语言的导航组件和 hooks
 */

import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// 创建国际化导航工具
// 这些导出的工具会自动处理语言前缀
export const {
  // 国际化的 Link 组件，自动添加语言前缀
  Link,

  // 国际化的 redirect 函数
  redirect,

  // 获取当前路径（不含语言前缀）
  usePathname,

  // 国际化的 router
  useRouter,

  // 获取完整路径（含语言前缀）
  getPathname,
} = createNavigation(routing);
