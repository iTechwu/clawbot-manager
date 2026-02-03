/**
 * 火山引擎风险检测 Internal Client
 *
 * 职责：仅负责与火山引擎 API 通信
 * - 不访问数据库
 * - 不包含缓存逻辑
 * - 不包含业务逻辑
 */
import { Injectable, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { firstValueFrom } from 'rxjs';
import { Signer } from '@volcengine/openapi';
import { getKeysConfig } from '@/config/configuration';
import { RiskConfig } from '@/config/validation';
import enviroment from '@/utils/enviroment.util';

export interface VolcengineRiskConfig {
  accessKey: string;
  secretKey: string;
  region: string;
  appId: number;
  baseUrl: string;
}

export interface TextRiskResult {
  DataId: string;
  Decision: 'PASS' | 'REVIEW' | 'BLOCK';
  FinalLabel: string;
  DecisionLabel: string;
  PassThrough?: any;
  TextCount?: number;
  Results?: any[];
}

export interface ImageRiskResult {
  DataId: string;
  Decision: 'PASS' | 'REVIEW' | 'BLOCK';
  FinalLabel: string;
  DecisionLabel: string;
  PassThrough?: any;
  Results?: any[];
}

export interface VideoRiskSubmitResult {
  DataId: string;
  TaskId?: string;
}

export interface VideoRiskQueryResult {
  DataId: string;
  FinalLabel?: string;
  DecisionLabel?: string;
  PassThrough?: any;
  VideoResults?: {
    Decision: 'PASS' | 'REVIEW' | 'BLOCK';
    ImageSliceCount: number;
    Frames?: any[];
  };
  AudioResults?: {
    Decision: 'PASS' | 'REVIEW' | 'BLOCK';
    Details?: any[];
    AudioText?: string;
  };
}

@Injectable()
export class RiskDetectionClient {
  private readonly riskConfig: VolcengineRiskConfig;
  private readonly isConfigured: boolean;

  constructor(
    private readonly httpService: HttpService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {
    const config = getKeysConfig()?.risk as RiskConfig | undefined;

    if (!config || !config.volcengine) {
      this.logger.warn('Volcengine Risk config not found');
      this.isConfigured = false;
      this.riskConfig = {
        accessKey: '',
        secretKey: '',
        region: 'cn-shanghai',
        appId: 0,
        baseUrl: 'https://open.volcengineapi.com',
      };
      return;
    }

    const volcengineConfig = config.volcengine;

    this.riskConfig = {
      accessKey: volcengineConfig.accessKey || '',
      secretKey: volcengineConfig.secretKey || '',
      region: volcengineConfig.region || 'cn-shanghai',
      appId: volcengineConfig.appId || 0,
      baseUrl: volcengineConfig.baseUrl || 'https://open.volcengineapi.com',
    };

    this.isConfigured = !!(
      this.riskConfig.accessKey && this.riskConfig.secretKey
    );

    if (this.isConfigured) {
      if (enviroment.isProduction()) {
        this.logger.info('RiskDetectionClient initialized successfully', {
          accessKey: this.riskConfig.accessKey,
          secretKey: this.riskConfig.secretKey,
          region: this.riskConfig.region,
          appId: this.riskConfig.appId,
          baseUrl: this.riskConfig.baseUrl,
        });
      }
    } else {
      this.logger.warn('RiskDetectionClient: credentials not configured');
    }
  }

  /**
   * 文本风险检测
   */
  async detectTextRisk(
    text: string,
    dataId: string,
  ): Promise<TextRiskResult | undefined> {
    if (!this.isConfigured) {
      this.logger.warn('RiskDetectionClient not configured');
      return undefined;
    }

    return await this.volcengineApi({
      body: {
        AppId: this.riskConfig.appId,
        Service: 'text_risk',
        Parameters: {
          biztype: 'risk_detection',
          text,
          account_id: '23332',
          data_id: dataId,
        },
      },
      params: {
        Action: 'TextSliceRisk',
        Version: '2022-11-07',
      },
      method: 'POST',
    });
  }

  /**
   * 图片内容风险检测
   */
  async detectImageRisk(
    url: string,
    dataId: string,
  ): Promise<ImageRiskResult | undefined> {
    if (!this.isConfigured) {
      this.logger.warn('RiskDetectionClient not configured');
      return undefined;
    }

    return await this.volcengineApi({
      body: {
        AppId: this.riskConfig.appId,
        Service: 'image_content_risk',
        Parameters: {
          biztype: 'image_risk',
          account_id: '23332',
          data_id: dataId,
          url,
        },
      },
      params: {
        Action: 'ImageContentRiskV2',
        Version: '2021-11-29',
      },
      method: 'POST',
    });
  }

  /**
   * 提交视频风险检测任务（异步）
   */
  async submitVideoRisk(
    url: string,
    dataId: string,
  ): Promise<VideoRiskSubmitResult | undefined> {
    if (!this.isConfigured) {
      this.logger.warn('RiskDetectionClient not configured');
      return undefined;
    }

    return await this.volcengineApi({
      body: {
        AppId: this.riskConfig.appId,
        Service: 'video_risk',
        Parameters: {
          biztype: 'video_risk',
          account_id: '23332',
          data_id: dataId,
          url: url,
        },
      },
      params: {
        Action: 'AsyncVideoRisk',
        Version: '2021-11-29',
      },
    });
  }

  /**
   * 查询视频风险检测结果
   */
  async queryVideoRisk(
    dataId: string,
  ): Promise<VideoRiskQueryResult | undefined> {
    if (!this.isConfigured) {
      this.logger.warn('RiskDetectionClient not configured');
      return undefined;
    }

    return await this.volcengineApi({
      params: {
        AppId: this.riskConfig.appId,
        Service: 'video_risk',
        DataId: dataId,
        Action: 'VideoResult',
        Version: '2021-11-29',
      },
      body: {},
      method: 'GET',
    });
  }

  /**
   * 调用火山引擎 API
   */
  private async volcengineApi<T>({
    body = {},
    params,
    method = 'POST',
  }: {
    params: any;
    body?: any;
    method?: 'POST' | 'GET' | 'PUT' | 'DELETE' | 'PATCH';
  }): Promise<T | undefined> {
    if (body.Parameters && typeof body.Parameters === 'object') {
      body.Parameters = JSON.stringify({
        ...body.Parameters,
        operate_time: Math.floor(Date.now() / 1000),
      });
    }

    const openApiRequestData = {
      region: this.riskConfig.region,
      method,
      params: params,
      headers: {} as Record<string, string>,
      body: JSON.stringify(body),
    };

    const signer = new Signer(openApiRequestData, 'BusinessSecurity');

    signer.addAuthorization({
      accessKeyId: this.riskConfig.accessKey,
      secretKey: this.riskConfig.secretKey,
    });

    try {
      const response = await firstValueFrom(
        this.httpService.request({
          url: this.riskConfig.baseUrl,
          headers: openApiRequestData.headers,
          params: openApiRequestData.params,
          method: openApiRequestData.method,
          data: body,
        }),
      );

      this.logger.debug(
        `RiskDetectionClient response: ${JSON.stringify(response.data)}`,
      );

      if (response.data?.Result?.Code === 0) {
        return response.data.Result.Data as T;
      }

      this.logger.warn(
        `RiskDetectionClient API error: ${JSON.stringify(response.data?.Result)}`,
      );
      return undefined;
    } catch (error) {
      this.logger.error(
        `RiskDetectionClient API call failed: ${(error as Error).message}`,
      );
      return undefined;
    }
  }
}
