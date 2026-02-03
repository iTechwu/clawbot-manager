/**
 * Reconnection Strategy Configuration
 */
export interface ReconnectConfig {
  /** Maximum number of retry attempts (default: 5) */
  maxRetries?: number;
  /** Initial delay in milliseconds (default: 1000) */
  initialDelay?: number;
  /** Maximum delay in milliseconds (default: 30000) */
  maxDelay?: number;
  /** Exponential backoff multiplier (default: 2) */
  backoffMultiplier?: number;
  /** Add random jitter to delay (default: true) */
  jitter?: boolean;
  /** Callback when attempting reconnect */
  onReconnecting?: (attempt: number, delay: number) => void;
  /** Callback when reconnection succeeds */
  onReconnected?: () => void;
  /** Callback when all retries exhausted */
  onMaxRetriesReached?: () => void;
}

/**
 * Reconnection state
 */
export interface ReconnectState {
  /** Current retry attempt */
  attempt: number;
  /** Whether currently reconnecting */
  isReconnecting: boolean;
  /** Next retry delay in ms */
  nextDelay: number;
  /** Whether max retries reached */
  maxRetriesReached: boolean;
}

/**
 * Reconnection Manager
 *
 * Handles automatic reconnection with exponential backoff
 *
 * @example
 * ```typescript
 * const reconnect = new ReconnectManager({
 *   maxRetries: 5,
 *   onReconnecting: (attempt, delay) => {
 *     console.log(`Reconnecting in ${delay}ms (attempt ${attempt})`);
 *   },
 * });
 *
 * // On disconnect
 * reconnect.scheduleReconnect(async () => {
 *   await connectToServer();
 * });
 *
 * // On successful connection
 * reconnect.reset();
 * ```
 */
export class ReconnectManager {
  private config: Required<ReconnectConfig>;
  private attempt = 0;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private isReconnecting = false;

  constructor(config: ReconnectConfig = {}) {
    this.config = {
      maxRetries: config.maxRetries ?? 5,
      initialDelay: config.initialDelay ?? 1000,
      maxDelay: config.maxDelay ?? 30000,
      backoffMultiplier: config.backoffMultiplier ?? 2,
      jitter: config.jitter ?? true,
      onReconnecting: config.onReconnecting ?? (() => {}),
      onReconnected: config.onReconnected ?? (() => {}),
      onMaxRetriesReached: config.onMaxRetriesReached ?? (() => {}),
    };
  }

  /**
   * Calculate delay for current attempt
   */
  private calculateDelay(): number {
    const { initialDelay, maxDelay, backoffMultiplier, jitter } = this.config;

    let delay = initialDelay * Math.pow(backoffMultiplier, this.attempt);
    delay = Math.min(delay, maxDelay);

    if (jitter) {
      // Add random jitter (±25%)
      const jitterAmount = delay * 0.25;
      delay += (Math.random() - 0.5) * 2 * jitterAmount;
    }

    return Math.round(delay);
  }

  /**
   * Get current state
   */
  getState(): ReconnectState {
    return {
      attempt: this.attempt,
      isReconnecting: this.isReconnecting,
      nextDelay: this.calculateDelay(),
      maxRetriesReached: this.attempt >= this.config.maxRetries,
    };
  }

  /**
   * Schedule a reconnection attempt
   */
  async scheduleReconnect(reconnectFn: () => Promise<void>): Promise<boolean> {
    if (this.isReconnecting) {
      return false;
    }

    if (this.attempt >= this.config.maxRetries) {
      this.config.onMaxRetriesReached();
      return false;
    }

    this.isReconnecting = true;
    const delay = this.calculateDelay();
    this.attempt++;

    this.config.onReconnecting(this.attempt, delay);

    return new Promise((resolve) => {
      this.timeoutId = setTimeout(async () => {
        try {
          await reconnectFn();
          this.config.onReconnected();
          this.reset();
          resolve(true);
        } catch {
          this.isReconnecting = false;
          // Try again
          const success = await this.scheduleReconnect(reconnectFn);
          resolve(success);
        }
      }, delay);
    });
  }

  /**
   * Cancel pending reconnection
   */
  cancel(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.isReconnecting = false;
  }

  /**
   * Reset reconnection state (call on successful connection)
   */
  reset(): void {
    this.cancel();
    this.attempt = 0;
  }
}

/**
 * Online/Offline detection hook utilities
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

/**
 * Create online status listener
 */
export function createOnlineListener(
  onOnline: () => void,
  onOffline: () => void,
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: ReconnectConfig = {},
): Promise<T> {
  const manager = new ReconnectManager(config);

  const attempt = async (): Promise<T> => {
    try {
      return await fn();
    } catch (error) {
      const state = manager.getState();
      if (state.maxRetriesReached) {
        throw error;
      }

      return new Promise((resolve, reject) => {
        manager.scheduleReconnect(async () => {
          try {
            resolve(await fn());
          } catch (retryError) {
            reject(retryError);
          }
        });
      });
    }
  };

  return attempt();
}
