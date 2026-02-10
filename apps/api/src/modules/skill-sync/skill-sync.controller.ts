/**
 * OpenClaw Skill Sync Controller
 *
 * 提供技能同步相关的 API 端点
 */
import { Controller, Inject } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { skillSyncContract } from '@repo/contracts';
import { SkillSyncService } from './skill-sync.service';

const c = skillSyncContract;

@Controller()
export class SkillSyncController {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly skillSyncService: SkillSyncService,
  ) {}

  /**
   * 触发全量同步
   */
  @TsRestHandler(c.sync)
  async sync() {
    return tsRestHandler(c.sync, async ({ body }) => {
      const enableTranslation = body.enableTranslation ?? true;
      this.logger.info('SkillSyncController: 触发全量同步', {
        enableTranslation,
      });
      const result = await this.skillSyncService.syncAll(enableTranslation);
      return {
        status: 200,
        body: {
          code: 0,
          msg: 'success',
          data: result,
        },
      };
    });
  }

  /**
   * 翻译未翻译的技能
   */
  @TsRestHandler(c.translate)
  async translate() {
    return tsRestHandler(c.translate, async () => {
      this.logger.info('SkillSyncController: 翻译未翻译的技能');
      const result = await this.skillSyncService.translateUntranslated();
      return {
        status: 200,
        body: {
          code: 0,
          msg: 'success',
          data: result,
        },
      };
    });
  }

  /**
   * 获取同步状态
   */
  @TsRestHandler(c.status)
  async status() {
    return tsRestHandler(c.status, async () => {
      const status = await this.skillSyncService.getSyncStatus();
      return {
        status: 200,
        body: {
          code: 0,
          msg: 'success',
          data: status,
        },
      };
    });
  }

  /**
   * 获取所有技能类型
   */
  @TsRestHandler(c.skillTypes)
  async skillTypes() {
    return tsRestHandler(c.skillTypes, async () => {
      const skillTypes = await this.skillSyncService.getSkillTypes();
      return {
        status: 200,
        body: {
          code: 0,
          msg: 'success',
          data: { skillTypes },
        },
      };
    });
  }
}
