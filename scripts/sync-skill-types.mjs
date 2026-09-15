import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const sourcePath = 'packages/miniapp-types/src/index.ts';
const targetPath = 'skills/xunlei-miniapp-dev/references/api-types.ts';
const [source, metadata] = await Promise.all([
  readFile(new URL(sourcePath, root), 'utf8'),
  readFile(new URL('packages/miniapp-types/package.json', root), 'utf8'),
]);
const { name, version } = JSON.parse(metadata);
const expected = `// 完整 Manifest 与迅雷 API 类型参考，随 Skill 分发，无需安装依赖即可阅读。
// 对应类型包：${name}@${version}
// 仅供查阅，不要复制到应用中替代正式类型依赖。

${source}`;

if (process.argv.includes('--check')) {
  const actual = await readFile(new URL(targetPath, root), 'utf8').catch(error => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (actual !== expected) {
    console.error('Skill 类型参考缺失或已过期，请运行 pnpm skill:sync 并提交更新。');
    process.exitCode = 1;
  } else {
    console.log('Skill 类型参考与源码一致。');
  }
} else {
  await writeFile(new URL(targetPath, root), expected);
  console.log(`已同步 ${targetPath} (${version})`);
}
