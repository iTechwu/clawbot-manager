// API 配置
// API 基础地址从环境变量读取
// 在 .env.local 文件中设置以下环境变量：
// - NEXT_PUBLIC_SERVER_BASE_URL: 登录、上传文件、测评等接口的基础地址

/**
 * 获取 API 基础地址（用于登录、上传文件、测评等）
 */
const getServerBaseUrl = (): string => {
  const baseUrl = process.env.NEXT_PUBLIC_SERVER_BASE_URL;

  if (!baseUrl) {
    // Use default value during build time or development
    const defaultUrl = 'http://localhost:3100';
    if (
      process.env.NODE_ENV === 'development' ||
      process.env.NEXT_PHASE === 'phase-production-build'
    ) {
      return defaultUrl;
    }
    // At runtime in production, use default if not set
    console.warn('NEXT_PUBLIC_SERVER_BASE_URL 未设置，使用默认值', defaultUrl);
    return defaultUrl;
  }

  return baseUrl;
};

/**
 * 获取品牌名称
 */
const getBrandName = (): string => {
  const brandName = process.env.NEXT_PUBLIC_BRAND_NAME;
  return brandName || 'Xica.AI';
};

/**
 * 获取品牌 Logo 路径
 */
const getBrandLogo = (): string => {
  const brandLogo = process.env.NEXT_PUBLIC_BRAND_LOGO;
  return brandLogo || '/logo.svg';
};

/**
 * 获取品牌完整标题（用于页面标题）
 *
 * 产品定位：多智能体驱动的内容创作与运营平台
 * 核心能力：
 * - AI 内容创作（智能写作、创意生成）
 * - 知识库管理（进化型知识库、智能提取、质量评估）
 * - 智能推荐（向量检索、协同过滤）
 * - 招聘面试（AI 招聘 Agent、简历解析、智能匹配）
 * - 会议管理（实时转写、知识提取、纪要生成）
 * - 多智能体协作（AG-UI/Agno）
 */
const getBrandTitle = (): string => {
  const brandTitle = process.env.NEXT_PUBLIC_BRAND_TITLE;
  return brandTitle || 'XicaAI - Multi-Agent Content Creation ';
};

/**
 * 获取品牌描述（用于页面描述）
 *
 * 描述应包含：
 * - 产品定位（多智能体平台）
 * - 核心功能（内容创作、知识管理、智能推荐、招聘面试）
 * - 技术优势（AI 驱动、多智能体协作）
 * - 目标用户（企业团队、内容创作者、HR 团队）
 */
const getBrandDescription = (): string => {
  const brandDescription = process.env.NEXT_PUBLIC_BRAND_DESCRIPTION;
  return (
    brandDescription ||
    'XicaAI is an AI-powered multi-agent platform for content creation.'
  );
};

export const API_CONFIG = {
  // API 基础地址（用于登录、上传文件、测评等）
  baseUrl: getServerBaseUrl() + '/api',

  apiHealthUrl: getServerBaseUrl() + '/health',

  // API 端点路径 这些断点是不适用ts-rest-api的，用于登录和校验权限的断点，如果未来需要使用ts-rest-api，则将这些断点迁移到ts-rest-api中
  endpoints: {
    // 登录端点
    login: '/sign/in/mobile/password',

    // Token 刷新端点
    refreshToken: '/sign/refresh/token',
  },
};

/**
 * 品牌配置
 * 可通过环境变量覆盖：
 * - NEXT_PUBLIC_BRAND_NAME: 品牌名称（默认: "Xica.AI"）
 * - NEXT_PUBLIC_BRAND_LOGO: Logo 路径（默认: "/logo.svg"）
 * - NEXT_PUBLIC_BRAND_TITLE: 页面标题（默认: "XicaAI - Multi-Agent Content Creation"）
 * - NEXT_PUBLIC_BRAND_DESCRIPTION: 页面描述（默认: "XicaAI is an AI-powered multi-agent platform for content creation."）
 *
 * 产品定位说明：
 * XicaAI 是一个多智能体驱动的内容创作与运营平台，提供以下核心能力：
 * 1. AI 内容创作：智能写作、创意生成、多模态内容创作
 * 2. 知识库管理：进化型知识库系统、智能知识提取、质量评估、版本控制、相似度检测与合并
 * 3. 智能推荐：基于向量检索和协同过滤的知识推荐系统
 * 4. 招聘面试：AI 招聘 Agent、简历解析、JD 分析、人才匹配、智能面试
 * 5. 会议管理：实时转写、知识提取、智能纪要生成
 * 6. 多智能体协作：AG-UI/Agno 集成，支持多智能体协同工作
 */
export const BRAND_CONFIG = {
  name: getBrandName(),
  logo: getBrandLogo(),
  title: getBrandTitle(),
  description: getBrandDescription(),
};
