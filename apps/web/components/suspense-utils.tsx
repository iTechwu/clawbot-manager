'use client';

/**
 * Suspense 工具组件
 *
 * 提供 Suspense 相关的工具组件，简化加载状态处理
 */

import { Suspense, type ReactNode, type ComponentType } from 'react';
import { ErrorBoundary } from './error-boundary';
import { CardSkeleton, ListSkeleton, PageSkeleton } from './skeletons';

/**
 * 带错误边界的 Suspense 包装器
 *
 * @example
 * ```tsx
 * <AsyncBoundary fallback={<Loading />} errorFallback={<Error />}>
 *   <AsyncComponent />
 * </AsyncBoundary>
 * ```
 */
export function AsyncBoundary({
  children,
  fallback,
  errorFallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
  errorFallback?: ReactNode;
}) {
  return (
    <ErrorBoundary fallback={errorFallback}>
      <Suspense fallback={fallback}>{children}</Suspense>
    </ErrorBoundary>
  );
}

/**
 * 卡片加载边界
 */
export function CardBoundary({ children }: { children: ReactNode }) {
  return (
    <AsyncBoundary fallback={<CardSkeleton />}>{children}</AsyncBoundary>
  );
}

/**
 * 列表加载边界
 */
export function ListBoundary({
  children,
  count = 5,
}: {
  children: ReactNode;
  count?: number;
}) {
  return (
    <AsyncBoundary fallback={<ListSkeleton count={count} />}>
      {children}
    </AsyncBoundary>
  );
}

/**
 * 页面加载边界
 */
export function PageBoundary({ children }: { children: ReactNode }) {
  return (
    <AsyncBoundary fallback={<PageSkeleton />}>{children}</AsyncBoundary>
  );
}

/**
 * 创建带 Suspense 的组件包装器
 *
 * @example
 * ```tsx
 * const UserListWithSuspense = withSuspense(UserList, <ListSkeleton />);
 * ```
 */
export function withSuspense<P extends object>(
  Component: ComponentType<P>,
  fallback: ReactNode,
) {
  return function SuspenseWrapper(props: P) {
    return (
      <Suspense fallback={fallback}>
        <Component {...props} />
      </Suspense>
    );
  };
}

/**
 * 创建带错误边界和 Suspense 的组件包装器
 *
 * @example
 * ```tsx
 * const SafeUserList = withAsyncBoundary(UserList, {
 *   fallback: <ListSkeleton />,
 *   errorFallback: <ErrorMessage />,
 * });
 * ```
 */
export function withAsyncBoundary<P extends object>(
  Component: ComponentType<P>,
  options: {
    fallback?: ReactNode;
    errorFallback?: ReactNode;
  } = {},
) {
  return function AsyncBoundaryWrapper(props: P) {
    return (
      <AsyncBoundary
        fallback={options.fallback}
        errorFallback={options.errorFallback}
      >
        <Component {...props} />
      </AsyncBoundary>
    );
  };
}
