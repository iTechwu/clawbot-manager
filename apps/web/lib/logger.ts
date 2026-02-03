/**
 * Frontend Logger
 *
 * 浏览器兼容的日志库，替代 console.log
 * 支持日志级别控制和生产环境静默
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  level: LogLevel;
  prefix?: string;
  enableInProduction?: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private level: LogLevel;
  private prefix: string;
  private enableInProduction: boolean;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.level = config.level ?? this.getDefaultLevel();
    this.prefix = config.prefix ?? '[App]';
    this.enableInProduction = config.enableInProduction ?? false;
  }

  private getDefaultLevel(): LogLevel {
    if (typeof window === 'undefined') {
      return 'info';
    }
    return process.env.NODE_ENV === 'production' ? 'warn' : 'debug';
  }

  private shouldLog(level: LogLevel): boolean {
    // 在生产环境中，除非明确启用，否则只记录 warn 和 error
    if (
      process.env.NODE_ENV === 'production' &&
      !this.enableInProduction &&
      LOG_LEVELS[level] < LOG_LEVELS.warn
    ) {
      return false;
    }
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    return `${timestamp} ${this.prefix} [${level.toUpperCase()}] ${message}`;
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message), ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message), ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message), ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message), ...args);
    }
  }

  /**
   * 设置日志级别
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * 创建带有自定义前缀的子 logger
   */
  child(prefix: string): Logger {
    return new Logger({
      level: this.level,
      prefix: `${this.prefix}:${prefix}`,
      enableInProduction: this.enableInProduction,
    });
  }
}

// 默认 logger 实例
export const logger = new Logger();

// 创建模块专用 logger
export const createLogger = (prefix: string): Logger => {
  return logger.child(prefix);
};

// 导出类型
export type { LogLevel, LoggerConfig };
export { Logger };

export default logger;
