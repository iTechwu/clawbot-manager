import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import * as _ from 'lodash';
import * as path from 'path';
import { FastifyReply, FastifyRequest } from 'fastify';

/**
 * 获取项目根目录路径
 * 处理 Windows 环境下 $(pwd) 未展开的问题
 */
function getProjectRoot(): string {
  let projectRoot = process.env.PROJECT_ROOT;

  // 如果 PROJECT_ROOT 包含 $(pwd)，则替换为实际的工作目录
  if (projectRoot && projectRoot.includes('$(pwd)')) {
    projectRoot = projectRoot.replace('$(pwd)', process.cwd());
  }

  // 如果 PROJECT_ROOT 未设置或为空，使用当前工作目录
  if (!projectRoot) {
    projectRoot = process.cwd();
  }

  return projectRoot;
}

/** 日志输出模式类型 */
export type LogOutputMode = 'console' | 'file' | 'both';

/**
 * 生成 winston 配置
 * @param output 日志输出模式 (从 YAML config.app.nestLogOutput 获取)
 */
export function getWinstonConfig(output: LogOutputMode = 'file'): {
  format: winston.Logform.Format;
  transports: winston.transport[];
} {
  const projectRoot = getProjectRoot();
  const logsDir = path.join(projectRoot, 'logs');
  const transports: winston.transport[] = [];

  // 文件输出 (file 或 both 模式)
  if (output === 'file' || output === 'both') {
    transports.push(
      new DailyRotateFile({
        dirname: logsDir,
        filename: `${process.env.MICRO_SERVER_NAME}-%DATE%-info.log`,
        level: 'info',
        zippedArchive: true,
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
      }),
      new DailyRotateFile({
        dirname: logsDir,
        filename: `${process.env.MICRO_SERVER_NAME}-%DATE%-error.log`,
        level: 'error',
        zippedArchive: true,
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
      }),
      new DailyRotateFile({
        dirname: logsDir,
        filename: `${process.env.MICRO_SERVER_NAME}-%DATE%-warn.log`,
        level: 'warn',
        zippedArchive: true,
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
      }),
    );
  }

  // 控制台输出 (console 或 both 模式)
  if (output === 'console' || output === 'both') {
    transports.push(new winston.transports.Console());
  }

  // 格式化配置
  const formats = [winston.format.timestamp(), winston.format.json()];

  // if (output !== 'file') {
  formats.push(winston.format.prettyPrint()); // 日志格式化
  // }

  return {
    format: winston.format.combine(...formats),
    transports: transports,
  };
}

export function getReqMainInfo(
  req: FastifyRequest,
  res: FastifyReply,
): Record<string, unknown> {
  return {
    ..._.pick(req, [
      'ip',
      'hostname',
      'method',
      'url',
      'body',
      'user',
      'httpVersion',
      'headers',
    ]),
    ..._.pick(res, ['statusCode']),
  };
}

// 访问日志
// export const accessLogger = winston.createLogger(getWinstonConfig('ACCESS'))
// // 调用其他系统的请求日志
// export const requestLogger = winston.createLogger(getWinstonConfig('REQUEST'))
// // DB 日志
// export const dbLogger = winston.createLogger(getWinstonConfig('DB'))
// // 通用日志
// export const logger = winston.createLogger(getWinstonConfig('DEFAULT'))
// // 系统错误日志
// export const errorLogger = winston.createLogger(getWinstonConfig('ERROR'))
