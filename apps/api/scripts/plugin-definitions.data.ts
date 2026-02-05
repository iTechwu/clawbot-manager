/**
 * 预设插件定义
 * 基于 Anthropic MCP 官方服务器和常用社区插件
 * 支持区域分类: global (全球可用), cn (国内优化), en (海外优化)
 */

import type { Prisma } from '@prisma/client';

export type PluginCategory =
  | 'BROWSER'
  | 'FILESYSTEM'
  | 'DATABASE'
  | 'API'
  | 'COMMUNICATION'
  | 'DEVELOPMENT'
  | 'CUSTOM';

export type PluginRegion = 'global' | 'cn' | 'en';

export interface PluginDefinition {
  name: string;
  slug: string;
  description: string;
  version: string;
  author: string;
  category: PluginCategory;
  region: PluginRegion;
  configSchema: Prisma.InputJsonValue | null;
  defaultConfig: Prisma.InputJsonValue | null;
  mcpConfig: Prisma.InputJsonValue;
  isOfficial: boolean;
  iconEmoji: string;
  downloadUrl: string | null;
}

export const PLUGIN_DEFINITIONS: PluginDefinition[] = [
  // ============================================================================
  // 全球通用插件 (Global)
  // ============================================================================

  // --- Browser ---
  {
    name: 'Puppeteer',
    slug: 'puppeteer',
    description:
      '使用 Puppeteer 进行浏览器自动化，支持网页截图、PDF 生成、表单填写等操作',
    version: '1.0.0',
    author: 'Anthropic',
    category: 'BROWSER',
    region: 'global',
    configSchema: {
      type: 'object',
      properties: {
        headless: {
          type: 'boolean',
          description: '是否使用无头模式',
          default: true,
        },
        timeout: {
          type: 'number',
          description: '操作超时时间（毫秒）',
          default: 30000,
        },
      },
    },
    defaultConfig: {
      headless: true,
      timeout: 30000,
    },
    mcpConfig: {
      command: 'npx',
      args: ['-y', '@anthropic-ai/mcp-server-puppeteer'],
    },
    isOfficial: true,
    iconEmoji: '🌐',
    downloadUrl:
      'https://www.npmjs.com/package/@anthropic-ai/mcp-server-puppeteer',
  },
  {
    name: 'Fetch',
    slug: 'fetch',
    description: '安全地获取网页内容，支持 HTML 转 Markdown、robots.txt 检查',
    version: '1.0.0',
    author: 'Anthropic',
    category: 'BROWSER',
    region: 'global',
    configSchema: {
      type: 'object',
      properties: {
        userAgent: {
          type: 'string',
          description: '自定义 User-Agent',
        },
        maxSize: {
          type: 'number',
          description: '最大响应大小（字节）',
          default: 5242880,
        },
      },
    },
    defaultConfig: {
      maxSize: 5242880,
    },
    mcpConfig: {
      command: 'npx',
      args: ['-y', '@anthropic-ai/mcp-server-fetch'],
    },
    isOfficial: true,
    iconEmoji: '📥',
    downloadUrl: 'https://www.npmjs.com/package/@anthropic-ai/mcp-server-fetch',
  },

  // --- Filesystem ---
  {
    name: 'Filesystem',
    slug: 'filesystem',
    description:
      '安全的文件系统访问，支持读写文件、目录操作，可配置允许访问的目录',
    version: '1.0.0',
    author: 'Anthropic',
    category: 'FILESYSTEM',
    region: 'global',
    configSchema: {
      type: 'object',
      properties: {
        allowedDirectories: {
          type: 'array',
          items: { type: 'string' },
          description: '允许访问的目录列表',
          default: ['/workspace'],
        },
      },
      required: ['allowedDirectories'],
    },
    defaultConfig: {
      allowedDirectories: ['/workspace'],
    },
    mcpConfig: {
      command: 'npx',
      args: ['-y', '@anthropic-ai/mcp-server-filesystem', '/workspace'],
    },
    isOfficial: true,
    iconEmoji: '📁',
    downloadUrl:
      'https://www.npmjs.com/package/@anthropic-ai/mcp-server-filesystem',
  },

  // --- Database ---
  {
    name: 'PostgreSQL',
    slug: 'postgresql',
    description: '连接 PostgreSQL 数据库，支持查询、分析表结构',
    version: '1.0.0',
    author: 'Anthropic',
    category: 'DATABASE',
    region: 'global',
    configSchema: {
      type: 'object',
      properties: {
        connectionString: {
          type: 'string',
          description: 'PostgreSQL 连接字符串',
        },
      },
      required: ['connectionString'],
    },
    defaultConfig: null,
    mcpConfig: {
      command: 'npx',
      args: ['-y', '@anthropic-ai/mcp-server-postgres'],
      env: {
        POSTGRES_CONNECTION_STRING: '${connectionString}',
      },
    },
    isOfficial: true,
    iconEmoji: '🐘',
    downloadUrl:
      'https://www.npmjs.com/package/@anthropic-ai/mcp-server-postgres',
  },
  {
    name: 'SQLite',
    slug: 'sqlite',
    description: '访问 SQLite 数据库，支持查询和数据分析',
    version: '1.0.0',
    author: 'Anthropic',
    category: 'DATABASE',
    region: 'global',
    configSchema: {
      type: 'object',
      properties: {
        databasePath: {
          type: 'string',
          description: 'SQLite 数据库文件路径',
        },
      },
      required: ['databasePath'],
    },
    defaultConfig: null,
    mcpConfig: {
      command: 'npx',
      args: ['-y', '@anthropic-ai/mcp-server-sqlite'],
    },
    isOfficial: true,
    iconEmoji: '💾',
    downloadUrl:
      'https://www.npmjs.com/package/@anthropic-ai/mcp-server-sqlite',
  },
  {
    name: 'MySQL',
    slug: 'mysql',
    description: '连接 MySQL 数据库，支持只读查询和表结构分析',
    version: '1.0.0',
    author: 'Community',
    category: 'DATABASE',
    region: 'global',
    configSchema: {
      type: 'object',
      properties: {
        host: { type: 'string', description: '数据库主机' },
        port: { type: 'number', description: '端口', default: 3306 },
        user: { type: 'string', description: '用户名' },
        password: { type: 'string', description: '密码' },
        database: { type: 'string', description: '数据库名' },
      },
      required: ['host', 'user', 'password', 'database'],
    },
    defaultConfig: { port: 3306 },
    mcpConfig: {
      command: 'npx',
      args: ['-y', '@benborla29/mcp-server-mysql'],
    },
    isOfficial: false,
    iconEmoji: '🐬',
    downloadUrl: 'https://github.com/benborla/mcp-server-mysql',
  },

  // --- Development ---
  {
    name: 'Git',
    slug: 'git',
    description: 'Git 仓库操作，支持克隆、提交、分支管理、查看历史',
    version: '1.0.0',
    author: 'Anthropic',
    category: 'DEVELOPMENT',
    region: 'global',
    configSchema: {
      type: 'object',
      properties: {
        repositoryPath: {
          type: 'string',
          description: 'Git 仓库路径',
          default: '/workspace',
        },
      },
    },
    defaultConfig: {
      repositoryPath: '/workspace',
    },
    mcpConfig: {
      command: 'npx',
      args: ['-y', '@anthropic-ai/mcp-server-git'],
    },
    isOfficial: true,
    iconEmoji: '📦',
    downloadUrl: 'https://www.npmjs.com/package/@anthropic-ai/mcp-server-git',
  },
  {
    name: 'GitHub',
    slug: 'github',
    description: 'GitHub API 集成，支持仓库管理、Issue、PR、代码搜索等操作',
    version: '1.0.0',
    author: 'GitHub',
    category: 'DEVELOPMENT',
    region: 'global',
    configSchema: {
      type: 'object',
      properties: {
        personalAccessToken: {
          type: 'string',
          description: 'GitHub Personal Access Token',
        },
      },
      required: ['personalAccessToken'],
    },
    defaultConfig: null,
    mcpConfig: {
      command: 'npx',
      args: ['-y', '@anthropic-ai/mcp-server-github'],
      env: {
        GITHUB_PERSONAL_ACCESS_TOKEN: '${personalAccessToken}',
      },
    },
    isOfficial: true,
    iconEmoji: '🐙',
    downloadUrl:
      'https://www.npmjs.com/package/@anthropic-ai/mcp-server-github',
  },

  // --- Custom/Utility ---
  {
    name: 'Memory',
    slug: 'memory',
    description: '基于知识图谱的持久化记忆系统，让 AI 记住对话中的重要信息',
    version: '1.0.0',
    author: 'Anthropic',
    category: 'CUSTOM',
    region: 'global',
    configSchema: {
      type: 'object',
      properties: {
        storagePath: {
          type: 'string',
          description: '记忆存储路径',
          default: '/workspace/.memory',
        },
      },
    },
    defaultConfig: {
      storagePath: '/workspace/.memory',
    },
    mcpConfig: {
      command: 'npx',
      args: ['-y', '@anthropic-ai/mcp-server-memory'],
    },
    isOfficial: true,
    iconEmoji: '🧠',
    downloadUrl:
      'https://www.npmjs.com/package/@anthropic-ai/mcp-server-memory',
  },
  {
    name: 'Time',
    slug: 'time',
    description: '获取当前时间和时区转换功能',
    version: '1.0.0',
    author: 'Anthropic',
    category: 'CUSTOM',
    region: 'global',
    configSchema: {
      type: 'object',
      properties: {
        defaultTimezone: {
          type: 'string',
          description: '默认时区',
          default: 'Asia/Shanghai',
        },
      },
    },
    defaultConfig: {
      defaultTimezone: 'Asia/Shanghai',
    },
    mcpConfig: {
      command: 'npx',
      args: ['-y', '@anthropic-ai/mcp-server-time'],
    },
    isOfficial: true,
    iconEmoji: '⏰',
    downloadUrl: 'https://www.npmjs.com/package/@anthropic-ai/mcp-server-time',
  },
  {
    name: 'Sequential Thinking',
    slug: 'sequential-thinking',
    description: '动态问题解决框架，通过结构化思考步骤帮助 AI 解决复杂问题',
    version: '1.0.0',
    author: 'Anthropic',
    category: 'CUSTOM',
    region: 'global',
    configSchema: null,
    defaultConfig: null,
    mcpConfig: {
      command: 'npx',
      args: ['-y', '@anthropic-ai/mcp-server-sequential-thinking'],
    },
    isOfficial: true,
    iconEmoji: '🤔',
    downloadUrl:
      'https://www.npmjs.com/package/@anthropic-ai/mcp-server-sequential-thinking',
  },

  // ============================================================================
  // 国内优化插件 (CN) - 使用国内可访问的服务
  // ============================================================================

  // --- 飞书/Lark ---
  {
    name: '飞书 (Lark)',
    slug: 'feishu',
    description:
      '飞书/Lark 官方 OpenAPI MCP，支持消息发送、文档操作、日历管理等',
    version: '1.0.0',
    author: 'ByteDance',
    category: 'COMMUNICATION',
    region: 'cn',
    configSchema: {
      type: 'object',
      properties: {
        appId: { type: 'string', description: '飞书应用 App ID' },
        appSecret: { type: 'string', description: '飞书应用 App Secret' },
      },
      required: ['appId', 'appSecret'],
    },
    defaultConfig: null,
    mcpConfig: {
      command: 'npx',
      args: ['-y', '@anthropic-ai/mcp-server-lark'],
      env: {
        LARK_APP_ID: '${appId}',
        LARK_APP_SECRET: '${appSecret}',
      },
    },
    isOfficial: true,
    iconEmoji: '🐦',
    downloadUrl: 'https://github.com/larksuite/lark-openapi-mcp',
  },

  // --- 企业微信 ---
  {
    name: '企业微信 (WeCom)',
    slug: 'wecom',
    description: '企业微信机器人 MCP，支持发送消息、管理群聊等企业微信功能',
    version: '1.0.0',
    author: 'Community',
    category: 'COMMUNICATION',
    region: 'cn',
    configSchema: {
      type: 'object',
      properties: {
        webhookUrl: {
          type: 'string',
          description: '企业微信机器人 Webhook URL',
        },
        corpId: { type: 'string', description: '企业 ID (可选)' },
        agentId: { type: 'string', description: '应用 ID (可选)' },
        secret: { type: 'string', description: '应用 Secret (可选)' },
      },
      required: ['webhookUrl'],
    },
    defaultConfig: null,
    mcpConfig: {
      command: 'npx',
      args: ['-y', 'wecom-bot-mcp-server'],
      env: {
        WECOM_WEBHOOK_URL: '${webhookUrl}',
      },
    },
    isOfficial: false,
    iconEmoji: '💼',
    downloadUrl: 'https://github.com/loonghao/wecom-bot-mcp-server',
  },

  // --- 百度搜索 ---
  {
    name: '百度搜索',
    slug: 'baidu-search',
    description: '使用百度搜索引擎进行网络搜索，国内访问速度快',
    version: '1.0.0',
    author: 'Community',
    category: 'API',
    region: 'cn',
    configSchema: {
      type: 'object',
      properties: {
        maxResults: {
          type: 'number',
          description: '最大搜索结果数',
          default: 10,
        },
      },
    },
    defaultConfig: { maxResults: 10 },
    mcpConfig: {
      command: 'npx',
      args: ['-y', 'mcp-server-websearch', '--engine', 'baidu'],
    },
    isOfficial: false,
    iconEmoji: '🔎',
    downloadUrl: 'https://github.com/mnhlt/WebSearch-MCP',
  },

  // --- DuckDuckGo (国内可用的替代搜索) ---
  {
    name: 'DuckDuckGo 搜索',
    slug: 'duckduckgo',
    description: 'DuckDuckGo 搜索引擎，隐私友好，国内部分地区可用',
    version: '1.0.0',
    author: 'Community',
    category: 'API',
    region: 'cn',
    configSchema: {
      type: 'object',
      properties: {
        maxResults: {
          type: 'number',
          description: '最大搜索结果数',
          default: 10,
        },
        region: {
          type: 'string',
          description: '搜索区域',
          default: 'cn-zh',
        },
      },
    },
    defaultConfig: { maxResults: 10, region: 'cn-zh' },
    mcpConfig: {
      command: 'npx',
      args: ['-y', 'duckduckgo-mcp-server'],
    },
    isOfficial: false,
    iconEmoji: '🦆',
    downloadUrl: 'https://github.com/nickclyde/duckduckgo-mcp-server',
  },

  // ============================================================================
  // 海外优化插件 (EN) - 需要海外网络访问
  // ============================================================================

  // --- Google Drive ---
  {
    name: 'Google Drive',
    slug: 'google-drive',
    description: '访问和管理 Google Drive 文件，支持搜索、读取、创建文件',
    version: '1.0.0',
    author: 'Anthropic',
    category: 'FILESYSTEM',
    region: 'en',
    configSchema: {
      type: 'object',
      properties: {
        credentialsPath: {
          type: 'string',
          description: 'Google OAuth 凭证文件路径',
        },
      },
      required: ['credentialsPath'],
    },
    defaultConfig: null,
    mcpConfig: {
      command: 'npx',
      args: ['-y', '@anthropic-ai/mcp-server-gdrive'],
    },
    isOfficial: true,
    iconEmoji: '📂',
    downloadUrl:
      'https://www.npmjs.com/package/@anthropic-ai/mcp-server-gdrive',
  },

  // --- Brave Search ---
  {
    name: 'Brave Search',
    slug: 'brave-search',
    description: '使用 Brave Search API 进行网络搜索和本地搜索',
    version: '1.0.0',
    author: 'Anthropic',
    category: 'API',
    region: 'en',
    configSchema: {
      type: 'object',
      properties: {
        apiKey: {
          type: 'string',
          description: 'Brave Search API 密钥',
        },
      },
      required: ['apiKey'],
    },
    defaultConfig: null,
    mcpConfig: {
      command: 'npx',
      args: ['-y', '@anthropic-ai/mcp-server-brave-search'],
      env: {
        BRAVE_API_KEY: '${apiKey}',
      },
    },
    isOfficial: true,
    iconEmoji: '🔍',
    downloadUrl:
      'https://www.npmjs.com/package/@anthropic-ai/mcp-server-brave-search',
  },

  // --- Google Maps ---
  {
    name: 'Google Maps',
    slug: 'google-maps',
    description: '访问 Google Maps API，支持地点搜索、路线规划、地理编码',
    version: '1.0.0',
    author: 'Anthropic',
    category: 'API',
    region: 'en',
    configSchema: {
      type: 'object',
      properties: {
        apiKey: {
          type: 'string',
          description: 'Google Maps API 密钥',
        },
      },
      required: ['apiKey'],
    },
    defaultConfig: null,
    mcpConfig: {
      command: 'npx',
      args: ['-y', '@anthropic-ai/mcp-server-google-maps'],
      env: {
        GOOGLE_MAPS_API_KEY: '${apiKey}',
      },
    },
    isOfficial: true,
    iconEmoji: '🗺️',
    downloadUrl:
      'https://www.npmjs.com/package/@anthropic-ai/mcp-server-google-maps',
  },

  // --- Slack ---
  {
    name: 'Slack',
    slug: 'slack',
    description: '与 Slack 工作区交互，支持发送消息、管理频道、搜索历史',
    version: '1.0.0',
    author: 'Anthropic',
    category: 'COMMUNICATION',
    region: 'en',
    configSchema: {
      type: 'object',
      properties: {
        botToken: {
          type: 'string',
          description: 'Slack Bot Token (xoxb-...)',
        },
        teamId: {
          type: 'string',
          description: 'Slack Team ID',
        },
      },
      required: ['botToken'],
    },
    defaultConfig: null,
    mcpConfig: {
      command: 'npx',
      args: ['-y', '@anthropic-ai/mcp-server-slack'],
      env: {
        SLACK_BOT_TOKEN: '${botToken}',
        SLACK_TEAM_ID: '${teamId}',
      },
    },
    isOfficial: true,
    iconEmoji: '💬',
    downloadUrl: 'https://www.npmjs.com/package/@anthropic-ai/mcp-server-slack',
  },

  // --- GitLab ---
  {
    name: 'GitLab',
    slug: 'gitlab',
    description: 'GitLab API 集成，支持项目管理、Issue、MR 等操作',
    version: '1.0.0',
    author: 'Anthropic',
    category: 'DEVELOPMENT',
    region: 'en',
    configSchema: {
      type: 'object',
      properties: {
        personalAccessToken: {
          type: 'string',
          description: 'GitLab Personal Access Token',
        },
        gitlabUrl: {
          type: 'string',
          description: 'GitLab 实例 URL',
          default: 'https://gitlab.com',
        },
      },
      required: ['personalAccessToken'],
    },
    defaultConfig: {
      gitlabUrl: 'https://gitlab.com',
    },
    mcpConfig: {
      command: 'npx',
      args: ['-y', '@anthropic-ai/mcp-server-gitlab'],
      env: {
        GITLAB_PERSONAL_ACCESS_TOKEN: '${personalAccessToken}',
        GITLAB_API_URL: '${gitlabUrl}',
      },
    },
    isOfficial: true,
    iconEmoji: '🦊',
    downloadUrl:
      'https://www.npmjs.com/package/@anthropic-ai/mcp-server-gitlab',
  },

  // --- Sentry ---
  {
    name: 'Sentry',
    slug: 'sentry',
    description: '访问 Sentry 错误追踪数据，查看和分析应用错误',
    version: '1.0.0',
    author: 'Anthropic',
    category: 'DEVELOPMENT',
    region: 'en',
    configSchema: {
      type: 'object',
      properties: {
        authToken: {
          type: 'string',
          description: 'Sentry Auth Token',
        },
        organization: {
          type: 'string',
          description: 'Sentry Organization Slug',
        },
      },
      required: ['authToken', 'organization'],
    },
    defaultConfig: null,
    mcpConfig: {
      command: 'npx',
      args: ['-y', '@anthropic-ai/mcp-server-sentry'],
      env: {
        SENTRY_AUTH_TOKEN: '${authToken}',
        SENTRY_ORG: '${organization}',
      },
    },
    isOfficial: true,
    iconEmoji: '🐛',
    downloadUrl:
      'https://www.npmjs.com/package/@anthropic-ai/mcp-server-sentry',
  },

  // --- Everything (测试用) ---
  {
    name: 'Everything',
    slug: 'everything',
    description: 'MCP 测试服务器，包含所有类型的工具、资源和提示词示例',
    version: '1.0.0',
    author: 'Anthropic',
    category: 'CUSTOM',
    region: 'en',
    configSchema: null,
    defaultConfig: null,
    mcpConfig: {
      command: 'npx',
      args: ['-y', '@anthropic-ai/mcp-server-everything'],
    },
    isOfficial: true,
    iconEmoji: '🎁',
    downloadUrl:
      'https://www.npmjs.com/package/@anthropic-ai/mcp-server-everything',
  },
];
