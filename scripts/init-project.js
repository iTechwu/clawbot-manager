#!/usr/bin/env node

/**
 * Interactive Project Initialization Script
 * Customizes the scaffold with project-specific settings
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  header: (msg) =>
    console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`),
};

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Promisify question
const question = (query) =>
  new Promise((resolve) => rl.question(query, resolve));

// Project configuration
const config = {
  projectName: '',
  projectDescription: '',
  authorName: '',
  authorEmail: '',
  databaseUrl: '',
  redisUrl: '',
  apiPort: '',
  webPort: '',
};

async function main() {
  console.clear();
  log.header('╔════════════════════════════════════════════════════════════╗');
  log.header('║         PardxAI Monorepo Project Initialization            ║');
  log.header('╚════════════════════════════════════════════════════════════╝');

  log.info('This wizard will help you customize your project.\n');

  try {
    // Collect project information
    config.projectName = await question(
      `${colors.cyan}Project name${colors.reset} (e.g., my-awesome-app): `,
    );
    config.projectName = config.projectName.trim() || 'my-project';

    config.projectDescription = await question(
      `${colors.cyan}Project description${colors.reset}: `,
    );
    config.projectDescription =
      config.projectDescription.trim() || 'A PardxAI monorepo project';

    config.authorName = await question(
      `${colors.cyan}Author name${colors.reset}: `,
    );
    config.authorName = config.authorName.trim() || 'Your Name';

    config.authorEmail = await question(
      `${colors.cyan}Author email${colors.reset}: `,
    );
    config.authorEmail = config.authorEmail.trim() || 'your.email@example.com';

    log.header('\n📦 Configuration');

    config.apiPort = await question(
      `${colors.cyan}API port${colors.reset} [3100]: `,
    );
    config.apiPort = config.apiPort.trim() || '3100';

    config.webPort = await question(
      `${colors.cyan}Web port${colors.reset} [3000]: `,
    );
    config.webPort = config.webPort.trim() || '3000';

    config.databaseUrl = await question(
      `${colors.cyan}Database URL${colors.reset} [postgresql://user:password@localhost:5432/dbname]: `,
    );
    config.databaseUrl =
      config.databaseUrl.trim() ||
      'postgresql://user:password@localhost:5432/dbname';

    config.redisUrl = await question(
      `${colors.cyan}Redis URL${colors.reset} [redis://localhost:6379]: `,
    );
    config.redisUrl = config.redisUrl.trim() || 'redis://localhost:6379';

    rl.close();

    // Display configuration summary
    log.header('\n📋 Configuration Summary');
    console.log(
      `  Project Name:    ${colors.green}${config.projectName}${colors.reset}`,
    );
    console.log(`  Description:     ${config.projectDescription}`);
    console.log(
      `  Author:          ${config.authorName} <${config.authorEmail}>`,
    );
    console.log(`  API Port:        ${config.apiPort}`);
    console.log(`  Web Port:        ${config.webPort}`);
    console.log(`  Database:        ${config.databaseUrl}`);
    console.log(`  Redis:           ${config.redisUrl}`);

    // Apply configuration
    log.header('\n🔧 Applying Configuration');
    await applyConfiguration();

    // Success message
    log.header('\n✨ Project Initialized Successfully!');
    log.info('Next steps:');
    console.log(
      `  1. ${colors.cyan}pnpm install${colors.reset}          - Install dependencies`,
    );
    console.log(
      `  2. ${colors.cyan}pnpm db:generate${colors.reset}      - Generate Prisma client`,
    );
    console.log(
      `  3. ${colors.cyan}pnpm db:migrate:dev${colors.reset}   - Run database migrations`,
    );
    console.log(
      `  4. ${colors.cyan}pnpm dev${colors.reset}              - Start development servers`,
    );
    console.log('');
  } catch (error) {
    log.error(`Initialization failed: ${error.message}`);
    process.exit(1);
  }
}

async function applyConfiguration() {
  const rootDir = process.cwd();

  // Update root package.json
  log.info('Updating root package.json...');
  updatePackageJson(path.join(rootDir, 'package.json'), {
    name: config.projectName,
    description: config.projectDescription,
    author: `${config.authorName} <${config.authorEmail}>`,
  });
  log.success('Root package.json updated');

  // Update apps/web/package.json
  log.info('Updating web package.json...');
  updatePackageJson(path.join(rootDir, 'apps/web/package.json'), {
    name: `@repo/web`,
  });
  log.success('Web package.json updated');

  // Update apps/api/package.json
  log.info('Updating API package.json...');
  updatePackageJson(path.join(rootDir, 'apps/api/package.json'), {
    name: `@repo/api`,
  });
  log.success('API package.json updated');

  // Create .env files
  log.info('Creating environment files...');
  createEnvFile(path.join(rootDir, 'apps/web/.env.local'), {
    NEXT_PUBLIC_SERVER_BASE_URL: `http://localhost:${config.apiPort}`,
  });
  createEnvFile(path.join(rootDir, 'apps/api/.env'), {
    NODE_ENV: 'development',
    PORT: config.apiPort,
    HOST: '0.0.0.0',
    DATABASE_URL: config.databaseUrl,
    REDIS_URL: config.redisUrl,
    JWT_SECRET: generateRandomSecret(),
    JWT_EXPIRES_IN: '7d',
    CORS_ORIGIN: `http://localhost:${config.webPort}`,
  });
  log.success('Environment files created');

  // Update README
  log.info('Updating README...');
  updateReadme(path.join(rootDir, 'README.md'));
  log.success('README updated');
}

function updatePackageJson(filePath, updates) {
  if (!fs.existsSync(filePath)) {
    log.warning(`File not found: ${filePath}`);
    return;
  }

  const packageJson = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  Object.assign(packageJson, updates);
  fs.writeFileSync(filePath, JSON.stringify(packageJson, null, 2) + '\n');
}

function createEnvFile(filePath, variables) {
  const content =
    Object.entries(variables)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n') + '\n';

  fs.writeFileSync(filePath, content);
}

function updateReadme(filePath) {
  if (!fs.existsSync(filePath)) {
    log.warning(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(
    /# PardxAI Monorepo Scaffold/,
    `# ${config.projectName}`,
  );
  content = content.replace(
    /A production-ready monorepo scaffold based on PardxAI architecture\./,
    config.projectDescription,
  );
  fs.writeFileSync(filePath, content);
}

function generateRandomSecret() {
  return require('crypto').randomBytes(32).toString('hex');
}

// Run the script
main().catch((error) => {
  log.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
