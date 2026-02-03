/**
 * Next.js Proxy 中间件
 * 1. 处理根路径重定向到 /bots
 * 2. 处理每日打卡检查和重定向
 * 3. 处理国际化路由
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// 创建国际化中间件
const intlMiddleware = createIntlMiddleware(routing);

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip for static files and API routes
  if (
    pathname.includes('/_next') ||
    pathname.includes('/static') ||
    pathname.includes('/api') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|webp)$/)
  ) {
    return NextResponse.next();
  }

  // Redirect root path to /bots
  if (pathname === '/' || pathname === '') {
    const url = request.nextUrl.clone();
    url.pathname = '/bots';
    return NextResponse.redirect(url);
  }

  // Handle locale-prefixed root paths (e.g., /zh-CN, /en) -> redirect to /bots
  const localeMatch = pathname.match(/^\/(zh-CN|en)$/);
  if (localeMatch) {
    const url = request.nextUrl.clone();
    url.pathname = `${pathname}/bots`;
    return NextResponse.redirect(url);
  }

  // 先应用国际化中间件
  const intlResponse = intlMiddleware(request);

  // 提取语言前缀后的实际路径（例如 /zh-CN/home -> /home）
  const pathWithoutLocale = pathname.replace(/^\/(zh-CN|en)/, '') || '/';

  // Skip daily check-in logic for public routes
  const publicRoutes = ['/login', '/register'];
  if (publicRoutes.some((route) => pathWithoutLocale.includes(route))) {
    return intlResponse;
  }

  // Check if user is authenticated
  const token = request.cookies.get('auth-token')?.value;
  if (!token) {
    return intlResponse;
  }
  return intlResponse;
}

export const config = {
  matcher: [
    // 匹配根路径
    '/',
    // 匹配带语言前缀的路径
    '/(zh-CN|en)/:path*',
    // 匹配除以下之外的所有路径：
    // - api: API 路由
    // - _next: Next.js 内部路由
    // - _vercel: Vercel 内部路由
    // - 包含点号的路径（通常是静态文件）
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};
