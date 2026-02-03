import { FastifyRequest } from 'fastify';
import { FileEnvType } from '@prisma/client';

export default {
  getBaseZone() {
    return process.env?.BASE_ZONE || 'cn';
  },
  getNeedSsoLogin() {
    return process.env?.NEED_SSO_LOGIN || 'true';
  },
  getDevDebug() {
    return process.env?.LOCAL_DEV_DEBUG || 'true';
  },
  getDevConnectProdDB() {
    return process.env?.DEV_USE_PRODDB || 'false';
  },

  getEnv(): FileEnvType {
    if (
      process.env?.NODE_ENV === 'prod' ||
      process.env?.NODE_ENV === 'production'
    ) {
      return FileEnvType.prod;
    }
    if (process.env?.NODE_ENV === 'produs') {
      return FileEnvType.produs;
    }
    if (process.env?.NODE_ENV === 'prodap') {
      return FileEnvType.prodap;
    }
    if (process.env?.NODE_ENV === 'test') {
      return FileEnvType.test;
    }
    return FileEnvType.dev;
  },

  isDevDebug() {
    return this.isDev() && this.getDevDebug() === 'true';
  },

  isDevConnectProdDB() {
    return this.isDevDebug() && this.getDevConnectProdDB() === 'true';
  },

  isDev() {
    // return false
    return this.getEnv() === 'dev';
  },

  isTest() {
    return this.getEnv() === 'test';
  },

  isProduction() {
    return this.getEnv().startsWith('prod');
  },

  isCheckSha256() {
    return this.isProduction();
  },

  isCnProduction() {
    return this.getEnv() === 'prod';
  },

  isApProduction() {
    return this.getEnv() === 'prodap';
  },

  checkEnvCanSso() {
    return ['dev', 'test', 'prod'].indexOf(this.getEnv()) !== -1;
  },

  isWeChatMiniProgram(req: FastifyRequest) {
    const userAgent = (req.headers['user-agent'] || '').toLowerCase();
    return (
      userAgent.includes('micromessenger') &&
      (userAgent.includes('miniprogram') ||
        userAgent.includes('wechatdevtools'))
    );
  },

  generateEnvironmentUrls(): {
    web: string;
    api: string;
    internalApi: string;
    short: string;
    corsDomains: string[];
  } {
    const protocol = this.isProduction() ? 'https' : 'http';
    const corsDomains = ['*', '*.xica.ai', '*.xica.ai'];
    let domain,
      subDomain = '',
      apiSubDomain = '';

    switch (true) {
      case this.isDev():
        domain = 'xica.ai';
        subDomain = 'www.local';
        apiSubDomain = 'api.local';
        break;
      case this.isTest():
        domain = 'xica.ai';
        subDomain = 'www.test';
        apiSubDomain = 'api.test';
        break;
      case this.isCnProduction():
        domain = 'xica.cn';
        subDomain = 'www';
        apiSubDomain = 'mp';
        break;
      default:
        domain = 'xica.ai';
        subDomain = 'www';
        apiSubDomain = 'api';
        break;
    }

    const web = `${protocol}://${subDomain ? `${subDomain}.` : ''}${domain}/`;
    let api = `${protocol}://${apiSubDomain ? `${apiSubDomain}.` : ''}${domain}/api`;
    let internalApi = api;
    // console.log('techwu api', corsDomains);
    if (this.isDev()) {
      api = process.env.API_BASE_URL || api;
      internalApi = process.env.INTERNAL_API_BASE_URL || api;
    }
    const short = `${web}s/`;
    return { web, api, internalApi, short, corsDomains };
  },
};
