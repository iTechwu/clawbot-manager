'use client';

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { trackError } from '@/lib/errors/error-tracking';

/**
 * Error Boundary Props
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  /** 自定义错误回退 UI */
  fallback?: ReactNode;
  /** 错误回调函数 */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** 是否显示重试按钮 */
  showRetry?: boolean;
}

/**
 * Error Boundary State
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * 默认错误回退 UI
 */
function DefaultErrorFallback({
  error,
  onRetry,
  showRetry = true,
}: {
  error?: Error;
  onRetry?: () => void;
  showRetry?: boolean;
}) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center p-8 text-center">
      <div className="mb-4 text-6xl">😵</div>
      <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
        出错了
      </h2>
      <p className="mb-4 text-gray-600 dark:text-gray-400">
        {error?.message || '页面发生了意外错误'}
      </p>
      {showRetry && onRetry && (
        <button
          onClick={onRetry}
          className="rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
        >
          重试
        </button>
      )}
    </div>
  );
}

/**
 * React Error Boundary 组件
 *
 * 用于捕获子组件树中的 JavaScript 错误，记录错误并显示回退 UI
 *
 * @example
 * ```tsx
 * <ErrorBoundary fallback={<CustomError />}>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 记录错误信息
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // 更新状态以包含错误信息
    this.setState({ errorInfo });

    // 调用错误回调
    this.props.onError?.(error, errorInfo);

    // 发送到错误追踪服务
    trackError(error, errorInfo, {
      metadata: { source: 'ErrorBoundary' },
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // 如果提供了自定义 fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 否则使用默认错误 UI
      return (
        <DefaultErrorFallback
          error={this.state.error}
          onRetry={this.handleRetry}
          showRetry={this.props.showRetry}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * 页面级 Error Boundary
 * 用于包裹整个页面，提供更友好的错误提示
 */
export function PageErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      showRetry
      onError={(error, errorInfo) => {
        // 页面级错误可以记录更多上下文
        console.error('Page error:', {
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
        });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * 组件级 Error Boundary
 * 用于包裹单个组件，错误不会影响其他组件
 */
export function ComponentErrorBoundary({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <ErrorBoundary fallback={fallback} showRetry={false}>
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;
