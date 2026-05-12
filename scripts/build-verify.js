const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const rootDir = path.resolve(__dirname, '..');

const targets = [
  {
    name: 'frontend/dist',
    dir: path.join(rootDir, 'frontend', 'dist'),
  },
  {
    name: 'server/public',
    dir: path.join(rootDir, 'server', 'public'),
  },
  {
    name: 'dist-electron/win-unpacked/resources/server/public',
    dir: path.join(rootDir, 'dist-electron', 'win-unpacked', 'resources', 'server', 'public'),
    optional: true,
  },
];

function walkFiles(baseDir, currentDir = baseDir) {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(baseDir, fullPath));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
    if (relativePath === '.gitkeep') {
      continue;
    }

    const buffer = fs.readFileSync(fullPath);
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');

    files.push({
      relativePath,
      size: buffer.length,
      sha256,
    });
  }

  return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

function buildManifest(target) {
  if (!fs.existsSync(target.dir)) {
    if (target.optional) {
      return null;
    }

    throw new Error(`目录不存在: ${target.dir}`);
  }

  const files = walkFiles(target.dir);
  const byPath = new Map(files.map(file => [file.relativePath, file]));

  return {
    ...target,
    files,
    byPath,
  };
}

function compareManifests(left, right) {
  const issues = [];
  const allPaths = new Set([
    ...left.files.map(file => file.relativePath),
    ...right.files.map(file => file.relativePath),
  ]);

  for (const relativePath of [...allPaths].sort()) {
    const leftFile = left.byPath.get(relativePath);
    const rightFile = right.byPath.get(relativePath);

    if (!leftFile) {
      issues.push(`[${left.name}] 缺少文件: ${relativePath}`);
      continue;
    }

    if (!rightFile) {
      issues.push(`[${right.name}] 缺少文件: ${relativePath}`);
      continue;
    }

    if (leftFile.size !== rightFile.size) {
      issues.push(`文件大小不一致: ${relativePath} (${left.name}=${leftFile.size}, ${right.name}=${rightFile.size})`);
      continue;
    }

    if (leftFile.sha256 !== rightFile.sha256) {
      issues.push(`文件内容不一致: ${relativePath}`);
    }
  }

  return issues;
}

function printSummary(manifest) {
  const totalBytes = manifest.files.reduce((sum, file) => sum + file.size, 0);
  console.log(`${manifest.name}: ${manifest.files.length} files, ${totalBytes} bytes`);
}

function main() {
  const manifests = targets
    .map(buildManifest)
    .filter(Boolean);

  if (manifests.length < 2) {
    throw new Error('可校验的构建目录不足');
  }

  console.log('Build verify summary');
  for (const manifest of manifests) {
    printSummary(manifest);
  }

  const allIssues = [];
  for (let i = 0; i < manifests.length - 1; i++) {
    const current = manifests[i];
    const next = manifests[i + 1];
    const issues = compareManifests(current, next);

    if (issues.length) {
      allIssues.push(`\n${current.name} <-> ${next.name}`);
      allIssues.push(...issues);
    } else {
      console.log(`OK: ${current.name} 与 ${next.name} 一致`);
    }
  }

  if (allIssues.length) {
    console.error('\nBuild verify failed');
    for (const issue of allIssues) {
      console.error(issue);
    }
    process.exitCode = 1;
    return;
  }

  console.log('\nBuild verify passed');
}

try {
  main();
} catch (error) {
  console.error('Build verify error:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
