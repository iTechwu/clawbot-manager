const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const nodeModules = path.join(rootDir, 'node_modules');
const targetLink = path.join(nodeModules, '.prisma');

// Find .prisma in pnpm's .pnpm directory
const pnpmDir = path.join(nodeModules, '.pnpm');

function findPrismaDir(dir) {
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
        if (entry.startsWith('@prisma+client')) {
            const prismaPath = path.join(dir, entry, 'node_modules', '.prisma');
            if (fs.existsSync(prismaPath)) {
                return prismaPath;
            }
        }
    }
    return null;
}

try {
    const prismaDir = findPrismaDir(pnpmDir);

    if (!prismaDir) {
        console.log('Could not find .prisma directory in pnpm cache');
        process.exit(0);
    }

    // Remove existing symlink if present
    if (fs.existsSync(targetLink)) {
        fs.unlinkSync(targetLink);
    }

    // Create symlink
    fs.symlinkSync(prismaDir, targetLink, 'junction');
    console.log(`Created symlink: ${targetLink} -> ${prismaDir}`);
} catch (error) {
    console.error('Error creating .prisma symlink:', error.message);
    // Don't fail the install
    process.exit(0);
}
