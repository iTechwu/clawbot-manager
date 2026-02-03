/**
 * OCR Internal Client
 *
 * 职责：仅负责与本地 OCR 服务通信
 * - 调用 127.0.0.1:8004/api/ocr 提取文本
 * - 不访问数据库
 * - 不包含业务逻辑
 */
import { Injectable, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { firstValueFrom } from 'rxjs';
import { OcrRequest, OcrResult } from './dto/ocr.dto';

export interface OcrClientConfig {
  baseUrl: string;
  timeout: number;
}

@Injectable()
export class OcrClient {
  private readonly config: OcrClientConfig;

  constructor(
    private readonly httpService: HttpService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {
    this.config = {
      baseUrl: process.env.OCR_SERVICE_URL || 'http://127.0.0.1:8004',
      timeout: parseInt(process.env.OCR_TIMEOUT || '60000', 10),
    };

    this.logger.info(
      `OcrClient initialized with base URL: ${this.config.baseUrl}`,
    );
  }

  /**
   * 提取文件文本内容
   * @param fileUrl 文件 URL
   * @param fileType 文件类型 (pdf, docx, doc, png, jpg, jpeg, etc.)
   * @param options 可选参数
   */
  async extractText(
    fileUrl: string,
    fileType: string,
    options?: { extractPages?: boolean; language?: string },
  ): Promise<OcrResult> {
    const request: OcrRequest = {
      fileUrl,
      fileType,
      extractPages: options?.extractPages ?? false,
      language: options?.language ?? 'auto',
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post<OcrResult>(
          `${this.config.baseUrl}/api/ocr`,
          request,
          {
            timeout: this.config.timeout,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      this.logger.debug(
        `OCR extraction completed for ${fileUrl}, confidence: ${response.data.confidence}`,
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        `OCR extraction failed for ${fileUrl}: ${(error as Error).message}`,
      );
      throw new Error(`OCR extraction failed: ${(error as Error).message}`);
    }
  }

  /**
   * 批量提取文件文本
   * @param files 文件列表
   */
  async extractTextBatch(
    files: Array<{ fileUrl: string; fileType: string }>,
  ): Promise<Array<OcrResult | { error: string; fileUrl: string }>> {
    const results: Array<OcrResult | { error: string; fileUrl: string }> = [];

    for (const file of files) {
      try {
        const result = await this.extractText(file.fileUrl, file.fileType);
        results.push(result);
      } catch (error) {
        results.push({
          error: (error as Error).message,
          fileUrl: file.fileUrl,
        });
      }
    }

    return results;
  }

  /**
   * 检查 OCR 服务健康状态
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.config.baseUrl}/health`, {
          timeout: 5000,
        }),
      );
      return response.status === 200;
    } catch {
      return false;
    }
  }
}
