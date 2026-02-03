import * as dotenv from 'dotenv';
import * as dotenvExpand from 'dotenv-expand';
import * as fs from 'fs';
import * as path from 'path';

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

export default {
  loadEnvFile(filePath: string): void {
    try {
      // 使用 dotenv 的 config 方法加载环境变量
      // 注意：不需要 { silent: true }，因为默认就会静默处理找不到文件的情况
      const result = dotenv.config({ path: filePath, override: true });
      // console.log('loadEnvFile start WM', filePath, result)
      if (result.error) {
        // 如果有错误且文件确实存在，则抛出错误
        if (fs.existsSync(filePath)) {
          throw result.error;
        }
      } else if (result.parsed) {
        // 使用 dotenv-expand 展开变量引用（如 ${VAR} 或 $VAR）
        dotenvExpand.expand(result);
      }
    } catch (err) {
      // 你可以选择在这里记录错误或进行其他处理
      console.error(`Failed to load ${filePath}`, err);
    }
  },
  loadEnv(envPaths: string[]): void {
    const root = getProjectRoot();
    for (const file of envPaths) {
      this.loadEnvFile(path.resolve(root, file));
    }
  },
};
