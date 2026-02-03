import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

@Injectable()
export class EncryptionService {
  private masterKey: Buffer;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly configService: ConfigService,
  ) {
    const masterKeyHex = process.env.BOT_MASTER_KEY;
    if (masterKeyHex) {
      this.masterKey = Buffer.from(masterKeyHex, 'hex');
    } else {
      // Generate a random key for development (not recommended for production)
      this.masterKey = randomBytes(32);
      this.logger.warn(
        '⚠️  BOT_MASTER_KEY not set, using random key. Set BOT_MASTER_KEY in production.',
      );
    }
  }

  /**
   * Encrypt plaintext using AES-256-GCM
   * @param plaintext - The string to encrypt
   * @returns Buffer containing IV + AuthTag + Ciphertext
   */
  encrypt(plaintext: string): Buffer {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.masterKey, iv);

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    // Format: IV (12) + AuthTag (16) + Ciphertext
    return Buffer.concat([iv, authTag, encrypted]);
  }

  /**
   * Decrypt ciphertext using AES-256-GCM
   * @param ciphertext - Buffer containing IV + AuthTag + Ciphertext
   * @returns Decrypted string
   */
  decrypt(ciphertext: Buffer): string {
    const iv = ciphertext.subarray(0, IV_LENGTH);
    const authTag = ciphertext.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = ciphertext.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = createDecipheriv(ALGORITHM, this.masterKey, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }

  /**
   * Hash a token using SHA-256
   * @param token - The token to hash
   * @returns Hex-encoded hash
   */
  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generate a random token
   * @returns 64-character hex string
   */
  generateToken(): string {
    return randomBytes(32).toString('hex');
  }
}
