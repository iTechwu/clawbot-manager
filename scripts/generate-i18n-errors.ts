#!/usr/bin/env ts-node
/**
 * Generate i18n error messages from @repo/contracts error definitions
 * 从 @repo/contracts 错误定义生成 i18n 错误消息
 *
 * Usage:
 *   npx ts-node scripts/generate-i18n-errors.ts           # Generate and update files
 *   npx ts-node scripts/generate-i18n-errors.ts --dry-run # Preview changes without writing
 *   npx ts-node scripts/generate-i18n-errors.ts --check   # Check for missing translations (CI mode)
 *
 * This script:
 * 1. Reads error type mappings from @repo/contracts
 * 2. Generates errors.json for each locale
 * 3. Preserves existing translations
 * 4. Reports missing and unused translations
 */

import * as fs from 'fs';
import * as path from 'path';

// Import error type mappings from compiled contracts
import {
  UserErrorTypes,
  CommonErrorTypes,
} from '../packages/contracts/src/errors/domains/index';

// CLI arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isCheck = args.includes('--check');

// i18n output paths
const I18N_BASE_PATH = path.join(__dirname, '../apps/api/libs/i18n');

const LOCALES = ['en', 'zh-CN'];

// Domain to error types mapping
const ERROR_TYPE_MAPPINGS: Record<string, Record<number, string>> = {
  user: UserErrorTypes,
  common: CommonErrorTypes,
};

// Default English messages - comprehensive list from existing errors.json
const DEFAULT_EN_MESSAGES: Record<string, Record<string, string>> = {
  user: {
    oauthAccountAlreadyExist: 'OAuth Account Already Exists',
    userNotFound: 'User Not Found',
    userAlreadyExists: 'User Already Exists',
    invalidPassword: 'Invalid Password',
    invalidVerifyCode: 'Invalid Verification Code',
    writeAccessTokenFail: 'Failed to write access token',
    ssoHostNameError: 'Invalid SSO hostname error',
    oauthTokenInvalid: 'OAuth Token Invalid',
    nicknameIsTooLong: 'Nickname is too long',
    nicknameIsTooShort: 'Nickname is too short',
    emailIsInvalid: 'Email is invalid',
  },
  common: {
    idMustUUID: 'ID must be a valid UUID format',
    innerError: 'Internal Parameter Error',
    internalServerError: 'Internal Server Error',
    badRequest: 'Bad Request',
    unknown: 'Unknown Error',
    getStorageNull: 'User Storage Content Not Found',
    dbCreateError: 'Database Creation Failed',
    dbUpdateError: 'Database Update Failed',
    dbDeleteError: 'Database Delete Failed',
    dbQueryError: 'Database Query Failed',
    templateNotFound: 'Template Not Found',
    invalidParameters: 'Invalid Parameters',
    signatureError: 'Signature Error',
    tooManyFolders: 'Too Many Folders',
    tooManyFiles: 'Too Many Files',
    notFound: 'Resource Not Found',
    planIsNotExist: 'Plan does not exist',
    planIsDeleted: 'Plan has been deleted',
    recommendPlanNotFound: 'Coming Soon',
    createOrderFail: 'Failed to create order',
    orderIsNotExist: 'Order does not exist',
    systemUnHealthy: 'System unhealthy',
    parameterError: 'Parameter Error',
    getProviderUserInfoError: 'Failed to Retrieve User Information',
    rabbitmqQueueIsNotExist: 'MQ Queue Not Found',
    storageResponseFailed: 'Failed to Access Storage',
    batchDeleteFolderFail: 'Failed to Batch Delete Folders',
    initiateMultipartUploadError: 'Initiate Multipart Upload Error',
    qrcodeGenerateError: 'QR Code Generation Error',
    fileServiceUnsupportedVendor: 'Unsupported File Service Vendor',
    qiniuZipDownloadError: 'Qiniu Zip Download Error',
    qiniuQueryFopStatusError: 'Qiniu Query FOP Status Error',
    qiniuUploaderError: 'Qiniu Uploader Error',
    s3NoSuchKey: 'No Such Key in bucket',
    s3NoSuchBucket: 'No Such Bucket',
    unAuthorized: 'Unauthorized',
    unauthorizedByKey: 'Unauthorized by Key',
    tooFrequent: 'Too Many Requests, Please Try Again Later',
    invalidToken: 'Invalid Token',
    invalidEnv: 'Invalid Env Config',
    invalidRedis: 'Invalid Redis',
    textCensorValidFailed: 'Text censor validation failed',
    featureAlreadyExists: 'Feature name already exists',
    featureNotFound: 'Feature not found',
    featureHasPermissions: 'Feature has associated permissions, cannot delete',
    someFeaturesHavePermissions:
      'Some features have associated permissions, cannot delete',
    wechatAccessTokenError: 'Wechat access token error',
    wechatMiniProgramQRCodeError: 'Failed to get mini program QR code',
    llmJinaAiEmbeddingError: 'Jina AI embedding API call failed',
    llmJinaAiRerankError: 'Jina AI rerank API call failed',
    llmJinaAiReadError: 'Jina AI read API call failed',
    llmJinaAiSearchError: 'Jina AI search API call failed',
    llmJinaAiClassifyError: 'Jina AI classify API call failed',
    llmJinaAiSegmentError: 'Jina AI segment API call failed',
    llmJinaAiGRelatedError: 'Jina AI related content API call failed',
    llmJinaAiDeepsearchError: 'Jina AI deep search API call failed',
    s3ClientInitializationError: 'S3 Client Initialization Failed',
    invalidVideoUri: 'Invalid video URI format, must be in s3:// format',
    invalidTaskId: 'Task ID cannot be empty',
    missingVendor: 'Either vendor or videoUri must be provided',
  },
};

interface ErrorsJson {
  [domain: string]: {
    [errorType: string]: string;
  };
}

interface ValidationResult {
  missing: string[];
  unused: string[];
  todoCount: number;
}

function loadExistingErrors(locale: string): ErrorsJson {
  const filePath = path.join(I18N_BASE_PATH, locale, 'errors.json');
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.warn(`Warning: Could not load ${filePath}:`, error);
  }
  return {};
}

function getExpectedErrorTypes(): Set<string> {
  const expected = new Set<string>();
  for (const [domain, errorTypes] of Object.entries(ERROR_TYPE_MAPPINGS)) {
    for (const errorType of Object.values(errorTypes)) {
      expected.add(`${domain}.${errorType}`);
    }
  }
  return expected;
}

function generateErrorsForLocale(locale: string): ErrorsJson {
  const existingErrors = loadExistingErrors(locale);
  const result: ErrorsJson = {};

  for (const [domain, errorTypes] of Object.entries(ERROR_TYPE_MAPPINGS)) {
    result[domain] = result[domain] || {};

    // Get all error type keys from the mapping
    const errorTypeValues = Object.values(errorTypes);

    for (const errorType of errorTypeValues) {
      // Preserve existing translation if available
      if (existingErrors[domain]?.[errorType]) {
        result[domain][errorType] = existingErrors[domain][errorType];
      } else if (locale === 'en' && DEFAULT_EN_MESSAGES[domain]?.[errorType]) {
        // Use default English message
        result[domain][errorType] = DEFAULT_EN_MESSAGES[domain][errorType];
      } else {
        // Placeholder for missing translation
        result[domain][errorType] = `[TODO] ${errorType}`;
      }
    }

    // Sort keys alphabetically for consistent output
    const sortedDomain: Record<string, string> = {};
    for (const key of Object.keys(result[domain]).sort()) {
      sortedDomain[key] = result[domain][key];
    }
    result[domain] = sortedDomain;
  }

  return result;
}

function validateErrors(errors: ErrorsJson, locale: string): ValidationResult {
  const expected = getExpectedErrorTypes();
  const missing: string[] = [];
  const unused: string[] = [];
  let todoCount = 0;

  // Check for missing translations
  for (const key of expected) {
    const [domain, errorType] = key.split('.');
    const value = errors[domain]?.[errorType];
    if (!value) {
      missing.push(key);
    } else if (value.startsWith('[TODO]')) {
      todoCount++;
    }
  }

  // Check for unused translations (in existing file but not in contracts)
  const existingErrors = loadExistingErrors(locale);
  for (const [domain, messages] of Object.entries(existingErrors)) {
    for (const errorType of Object.keys(messages)) {
      const key = `${domain}.${errorType}`;
      if (!expected.has(key)) {
        unused.push(key);
      }
    }
  }

  return { missing, unused, todoCount };
}

function generateDomainReport(): void {
  console.log('\n=== Error Code Domain Report ===\n');

  const domainStats: { domain: string; count: number }[] = [];

  for (const [domain, errorTypes] of Object.entries(ERROR_TYPE_MAPPINGS)) {
    const count = Object.keys(errorTypes).length;
    domainStats.push({ domain, count });
  }

  // Sort by count descending
  domainStats.sort((a, b) => b.count - a.count);

  for (const { domain, count } of domainStats) {
    const bar = '█'.repeat(Math.ceil(count / 5));
    console.log(`  ${domain.padEnd(10)} ${String(count).padStart(3)} ${bar}`);
  }

  const total = domainStats.reduce((sum, { count }) => sum + count, 0);
  console.log(
    `\n  ${'Total'.padEnd(10)} ${String(total).padStart(3)} error codes`,
  );
}

function compareAndReport(
  locale: string,
  newErrors: ErrorsJson,
): { added: string[]; modified: string[] } {
  const existing = loadExistingErrors(locale);
  const added: string[] = [];
  const modified: string[] = [];

  for (const [domain, messages] of Object.entries(newErrors)) {
    for (const [key, value] of Object.entries(messages)) {
      const existingValue = existing[domain]?.[key];
      if (!existingValue) {
        added.push(`${domain}.${key}`);
      } else if (existingValue !== value && !value.startsWith('[TODO]')) {
        modified.push(`${domain}.${key}`);
      }
    }
  }

  return { added, modified };
}

async function main() {
  console.log('=== i18n Error Messages Generator ===');

  if (isDryRun) {
    console.log('\n[DRY RUN MODE] No files will be written.\n');
  }

  if (isCheck) {
    console.log('\n[CHECK MODE] Validating translations...\n');
  }

  generateDomainReport();

  let hasErrors = false;

  for (const locale of LOCALES) {
    console.log(`\n--- Locale: ${locale} ---`);

    const errors = generateErrorsForLocale(locale);
    const validation = validateErrors(errors, locale);
    const changes = compareAndReport(locale, errors);

    // Report validation results
    if (validation.todoCount > 0) {
      console.log(
        `  ⚠ ${validation.todoCount} translations need attention [TODO]`,
      );
    }

    if (validation.missing.length > 0) {
      console.log(`  ✗ ${validation.missing.length} missing error codes:`);
      validation.missing
        .slice(0, 3)
        .forEach((m) => console.log(`      - ${m}`));
      if (validation.missing.length > 3) {
        console.log(`      ... and ${validation.missing.length - 3} more`);
      }
      hasErrors = true;
    }

    if (validation.unused.length > 0) {
      console.log(
        `  ⚠ ${validation.unused.length} unused translations (can be removed):`,
      );
      validation.unused.slice(0, 3).forEach((u) => console.log(`      - ${u}`));
      if (validation.unused.length > 3) {
        console.log(`      ... and ${validation.unused.length - 3} more`);
      }
    }

    // Report changes
    if (changes.added.length > 0) {
      console.log(`  + ${changes.added.length} new translations will be added`);
    }

    if (changes.modified.length > 0) {
      console.log(
        `  ~ ${changes.modified.length} translations will be modified`,
      );
    }

    if (changes.added.length === 0 && changes.modified.length === 0) {
      console.log('  ✓ No changes needed');
    }

    // Write file (unless dry-run or check mode)
    if (!isDryRun && !isCheck) {
      const outputPath = path.join(I18N_BASE_PATH, locale, 'errors.json');
      const outputDir = path.dirname(outputPath);

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      fs.writeFileSync(outputPath, JSON.stringify(errors, null, 2) + '\n');
      console.log(`  ✓ Written: ${outputPath}`);
    }
  }

  console.log('\n=== Summary ===');

  if (isCheck && hasErrors) {
    console.log(
      '\n✗ Validation failed! Some error codes are missing translations.',
    );
    process.exit(1);
  }

  if (isDryRun) {
    console.log(
      '\n[DRY RUN] No files were modified. Run without --dry-run to apply changes.',
    );
  } else if (!isCheck) {
    console.log('\n✓ Done! Error messages have been updated.');
  } else {
    console.log('\n✓ Validation passed!');
  }
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
