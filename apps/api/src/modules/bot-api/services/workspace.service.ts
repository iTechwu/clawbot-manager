import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

export interface BotWorkspaceConfig {
  hostname: string;
  name: string;
  aiProvider: string;
  model: string;
  channelType: string;
  persona: {
    name: string;
    soulMarkdown: string;
    emoji?: string;
    avatarUrl?: string;
  };
  features: {
    commands: boolean;
    tts: boolean;
    ttsVoice?: string;
    sandbox: boolean;
    sandboxTimeout?: number;
    sessionScope: 'user' | 'channel' | 'global';
  };
}

@Injectable()
export class WorkspaceService {
  private readonly dataDir: string;
  private readonly secretsDir: string;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly configService: ConfigService,
  ) {
    const dataDir = this.configService.get<string>(
      'BOT_DATA_DIR',
      '/data/bots',
    );
    const secretsDir = this.configService.get<string>(
      'BOT_SECRETS_DIR',
      '/data/secrets',
    );

    // 确保始终使用绝对路径，避免 Docker 将其当作 volume 名称解析
    this.dataDir = path.isAbsolute(dataDir)
      ? dataDir
      : path.join(process.cwd(), dataDir);
    this.secretsDir = path.isAbsolute(secretsDir)
      ? secretsDir
      : path.join(process.cwd(), secretsDir);
  }

  /**
   * Create workspace directory for a bot
   */
  async createWorkspace(config: BotWorkspaceConfig): Promise<string> {
    const workspacePath = path.join(this.dataDir, config.hostname);

    try {
      // Create workspace directory
      await fs.mkdir(workspacePath, { recursive: true });

      // Create config file
      const configPath = path.join(workspacePath, 'config.json');
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));

      // Create persona file (soul.md)
      const soulPath = path.join(workspacePath, 'soul.md');
      await fs.writeFile(soulPath, config.persona.soulMarkdown);

      // Create features config
      const featuresPath = path.join(workspacePath, 'features.json');
      await fs.writeFile(featuresPath, JSON.stringify(config.features, null, 2));

      // Create secrets directory for this bot
      const botSecretsPath = path.join(this.secretsDir, config.hostname);
      await fs.mkdir(botSecretsPath, { recursive: true });

      this.logger.info(`Workspace created for bot: ${config.hostname}`);
      return workspacePath;
    } catch (error) {
      this.logger.error(
        `Failed to create workspace for ${config.hostname}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Update workspace configuration
   */
  async updateWorkspace(hostname: string, config: Partial<BotWorkspaceConfig>): Promise<void> {
    const workspacePath = path.join(this.dataDir, hostname);
    const configPath = path.join(workspacePath, 'config.json');

    try {
      // Read existing config
      const existingConfig = JSON.parse(await fs.readFile(configPath, 'utf-8'));

      // Merge with new config
      const updatedConfig = { ...existingConfig, ...config };

      // Write updated config
      await fs.writeFile(configPath, JSON.stringify(updatedConfig, null, 2));

      // Update soul.md if persona changed
      if (config.persona?.soulMarkdown) {
        const soulPath = path.join(workspacePath, 'soul.md');
        await fs.writeFile(soulPath, config.persona.soulMarkdown);
      }

      // Update features if changed
      if (config.features) {
        const featuresPath = path.join(workspacePath, 'features.json');
        await fs.writeFile(featuresPath, JSON.stringify(config.features, null, 2));
      }

      this.logger.info(`Workspace updated for bot: ${hostname}`);
    } catch (error) {
      this.logger.error(
        `Failed to update workspace for ${hostname}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Delete workspace directory
   */
  async deleteWorkspace(hostname: string): Promise<void> {
    const workspacePath = path.join(this.dataDir, hostname);
    const botSecretsPath = path.join(this.secretsDir, hostname);

    try {
      // Remove workspace directory
      await fs.rm(workspacePath, { recursive: true, force: true });

      // Remove secrets directory
      await fs.rm(botSecretsPath, { recursive: true, force: true });

      this.logger.info(`Workspace deleted for bot: ${hostname}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete workspace for ${hostname}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Check if workspace exists
   */
  async workspaceExists(hostname: string): Promise<boolean> {
    const workspacePath = path.join(this.dataDir, hostname);
    try {
      await fs.access(workspacePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get workspace path
   */
  getWorkspacePath(hostname: string): string {
    return path.join(this.dataDir, hostname);
  }

  /**
   * Write API key to secrets directory
   */
  async writeApiKey(hostname: string, vendor: string, apiKey: string): Promise<void> {
    const botSecretsPath = path.join(this.secretsDir, hostname);
    const keyPath = path.join(botSecretsPath, `${vendor}.key`);

    try {
      await fs.mkdir(botSecretsPath, { recursive: true });
      await fs.writeFile(keyPath, apiKey, { mode: 0o600 });
      this.logger.info(`API key written for ${hostname}/${vendor}`);
    } catch (error) {
      this.logger.error(
        `Failed to write API key for ${hostname}/${vendor}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Remove API key from secrets directory
   */
  async removeApiKey(hostname: string, vendor: string): Promise<void> {
    const keyPath = path.join(this.secretsDir, hostname, `${vendor}.key`);

    try {
      await fs.unlink(keyPath);
      this.logger.info(`API key removed for ${hostname}/${vendor}`);
    } catch {
      // Ignore if file doesn't exist
    }
  }

  /**
   * List all workspaces
   */
  async listWorkspaces(): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.dataDir, { withFileTypes: true });
      return entries.filter((e) => e.isDirectory()).map((e) => e.name);
    } catch {
      return [];
    }
  }

  /**
   * Find orphaned workspaces (workspaces without corresponding database entries)
   */
  async findOrphanedWorkspaces(knownHostnames: string[]): Promise<string[]> {
    const workspaces = await this.listWorkspaces();
    return workspaces.filter((w) => !knownHostnames.includes(w));
  }

  /**
   * Find orphaned secrets directories
   */
  async findOrphanedSecrets(knownHostnames: string[]): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.secretsDir, { withFileTypes: true });
      const secretDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
      return secretDirs.filter((s) => !knownHostnames.includes(s));
    } catch {
      return [];
    }
  }

  /**
   * List all workspace hostnames
   * Used by ReconciliationService for orphan detection
   */
  async listWorkspaceHostnames(): Promise<string[]> {
    return this.listWorkspaces();
  }

  /**
   * List all secret directory hostnames
   * Used by ReconciliationService for orphan detection
   */
  async listSecretHostnames(): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.secretsDir, { withFileTypes: true });
      return entries.filter((e) => e.isDirectory()).map((e) => e.name);
    } catch {
      return [];
    }
  }

  /**
   * Delete secrets directory for a bot
   * Used by ReconciliationService for cleanup
   */
  async deleteSecrets(hostname: string): Promise<void> {
    const botSecretsPath = path.join(this.secretsDir, hostname);
    try {
      await fs.rm(botSecretsPath, { recursive: true, force: true });
      this.logger.info(`Secrets deleted for bot: ${hostname}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete secrets for ${hostname}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Write a secret file for a bot
   * Used for channel tokens and other secrets
   */
  async writeSecret(hostname: string, name: string, value: string): Promise<void> {
    const botSecretsPath = path.join(this.secretsDir, hostname);
    const secretPath = path.join(botSecretsPath, name);

    try {
      await fs.mkdir(botSecretsPath, { recursive: true });
      await fs.writeFile(secretPath, value, { mode: 0o600 });
      this.logger.info(`Secret written for ${hostname}/${name}`);
    } catch (error) {
      this.logger.error(
        `Failed to write secret for ${hostname}/${name}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Read a secret file for a bot
   */
  async readSecret(hostname: string, name: string): Promise<string | null> {
    const secretPath = path.join(this.secretsDir, hostname, name);
    try {
      return await fs.readFile(secretPath, 'utf-8');
    } catch {
      return null;
    }
  }
}
