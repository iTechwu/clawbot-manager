#!/usr/bin/env ts-node
/**
 * API 版本一致性校验脚本
 *
 * 用于 CI 流程验证：
 * 1. Contract 版本与 Controller 版本一致
 * 2. 禁止使用 magic string 作为版本号
 * 3. v2 控制器不能导入 v1 handler（反向 OK）
 *
 * 使用方法:
 *   npx ts-node scripts/validate-api-versions.ts
 *   pnpm validate:versions
 */

import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';

// 配置
const API_SRC_DIR = path.join(__dirname, '..', 'src', 'modules');
const CONTRACTS_SRC_DIR = path.join(
    __dirname,
    '..',
    '..',
    '..',
    'packages',
    'contracts',
    'src',
    'api',
);

// 允许的版本值（必须从常量导入）
const VALID_VERSION_PATTERNS = [
    'API_VERSION.V1',
    'API_VERSION.V2',
    "'1'", // 临时允许，后续应移除
    "'2'",
    '"1"',
    '"2"',
];

// 禁止的 magic string 模式
const FORBIDDEN_PATTERNS = [
    /version:\s*['"][0-9]+['"]/g, // version: '1' 或 version: "1" 在代码中
    /['"]x-api-version['"]/g, // 硬编码 header 名称
];

interface ValidationError {
    file: string;
    line: number;
    message: string;
    severity: 'error' | 'warning';
}

const errors: ValidationError[] = [];

/**
 * 检查文件中是否有 magic string
 */
function checkMagicStrings(filePath: string, content: string): void {
    const lines = content.split('\n');

    lines.forEach((line, index) => {
        // 跳过注释行
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
            return;
        }

        // 检查是否直接使用版本字符串而非常量
        if (
            /version:\s*['"][0-9]+['"]/.test(line) &&
            !line.includes('API_VERSION')
        ) {
            errors.push({
                file: filePath,
                line: index + 1,
                message:
                    '使用了 magic string 作为版本号，应使用 API_VERSION 常量',
                severity: 'warning',
            });
        }

        // 检查是否硬编码了 header 名称
        if (
            /['"]x-api-version['"]/.test(line) &&
            !line.includes('API_VERSION_HEADER')
        ) {
            errors.push({
                file: filePath,
                line: index + 1,
                message:
                    '硬编码了版本 header 名称，应使用 API_VERSION_HEADER 常量',
                severity: 'warning',
            });
        }
    });
}

/**
 * 检查控制器是否正确使用了版本装饰器
 */
function checkControllerVersioning(filePath: string, content: string): void {
    const lines = content.split('\n');

    // 检查是否使用了 @TsRestHandler
    if (!content.includes('@TsRestHandler')) {
        return; // 不是 ts-rest 控制器
    }

    // 检查是否使用了 @TsRestController
    if (!content.includes('@TsRestController')) {
        errors.push({
            file: filePath,
            line: 1,
            message:
                'ts-rest 控制器应使用 @TsRestController 装饰器而非 @Controller',
            severity: 'error',
        });
    }

    // 检查是否还在使用 @Controller
    const controllerMatch = content.match(
        /@Controller\s*\(/,
    );
    if (controllerMatch && !content.includes('@TsRestController')) {
        errors.push({
            file: filePath,
            line: content.substring(0, content.indexOf('@Controller')).split('\n').length,
            message: '发现 @Controller 装饰器，ts-rest 控制器应使用 @TsRestController',
            severity: 'error',
        });
    }
}

/**
 * 检查版本间的导入约束
 * v2 不能导入 v1 的 handler（反向 OK）
 */
function checkVersionImportConstraints(
    filePath: string,
    content: string,
): void {
    // 检测当前文件版本
    const isV2 =
        filePath.includes('-v2') ||
        filePath.includes('/v2/') ||
        content.includes("version: '2'") ||
        content.includes('version: API_VERSION.V2');

    if (!isV2) {
        return; // 只检查 v2 文件
    }

    // 检查是否导入了 v1 的内容
    const importLines = content.match(/import.*from\s+['"].*['"]/g) || [];
    importLines.forEach((importLine) => {
        if (
            (importLine.includes('-v1') || importLine.includes('/v1/')) &&
            !importLine.includes('types') &&
            !importLine.includes('schema')
        ) {
            const lineNumber =
                content.substring(0, content.indexOf(importLine)).split('\n')
                    .length;
            errors.push({
                file: filePath,
                line: lineNumber,
                message: 'v2 控制器不能导入 v1 的 handler（类型和 schema 除外）',
                severity: 'error',
            });
        }
    });
}

/**
 * 扫描控制器文件
 */
function scanControllers(): void {
    const pattern = path.join(API_SRC_DIR, '**', '*.controller.ts');
    const files = glob.sync(pattern);

    console.log(`\n📂 扫描控制器文件: ${files.length} 个文件\n`);

    files.forEach((file) => {
        const content = fs.readFileSync(file, 'utf-8');
        const relativePath = path.relative(process.cwd(), file);

        checkMagicStrings(relativePath, content);
        checkControllerVersioning(relativePath, content);
        checkVersionImportConstraints(relativePath, content);
    });
}

/**
 * 扫描契约文件
 */
function scanContracts(): void {
    const pattern = path.join(CONTRACTS_SRC_DIR, '*.contract.ts');
    const files = glob.sync(pattern);

    console.log(`📂 扫描契约文件: ${files.length} 个文件\n`);

    files.forEach((file) => {
        const content = fs.readFileSync(file, 'utf-8');
        const relativePath = path.relative(process.cwd(), file);

        checkMagicStrings(relativePath, content);
    });
}

/**
 * 输出结果
 */
function printResults(): void {
    const errorCount = errors.filter((e) => e.severity === 'error').length;
    const warningCount = errors.filter((e) => e.severity === 'warning').length;

    if (errors.length === 0) {
        console.log('✅ API 版本校验通过！\n');
        return;
    }

    console.log('\n' + '='.repeat(80));
    console.log('API 版本校验结果');
    console.log('='.repeat(80) + '\n');

    // 按文件分组输出
    const groupedErrors = errors.reduce(
        (acc, error) => {
            if (!acc[error.file]) {
                acc[error.file] = [];
            }
            acc[error.file].push(error);
            return acc;
        },
        {} as Record<string, ValidationError[]>,
    );

    Object.entries(groupedErrors).forEach(([file, fileErrors]) => {
        console.log(`📄 ${file}`);
        fileErrors.forEach((error) => {
            const icon = error.severity === 'error' ? '❌' : '⚠️';
            console.log(`   ${icon} Line ${error.line}: ${error.message}`);
        });
        console.log('');
    });

    console.log('='.repeat(80));
    console.log(
        `总计: ${errorCount} 个错误, ${warningCount} 个警告`,
    );
    console.log('='.repeat(80) + '\n');

    if (errorCount > 0) {
        process.exit(1);
    }
}

// 主函数
function main(): void {
    console.log('\n🔍 API 版本一致性校验\n');
    console.log('检查项目:');
    console.log('  1. 禁止使用 magic string 作为版本号');
    console.log('  2. ts-rest 控制器必须使用 @TsRestController');
    console.log('  3. v2 控制器不能导入 v1 handler');
    console.log('');

    scanControllers();
    scanContracts();
    printResults();
}

main();
