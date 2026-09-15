import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const sourcePath = 'packages/miniapp-types/src/index.ts';
const targetPath = 'skills/xunlei-miniapp-dev/references/api-types.ts';
const source = await readFile(new URL(sourcePath, root), 'utf8');
const expected = `// 完整 Manifest 与迅雷 API 类型参考，随 Skill 分发，无需安装依赖即可阅读。
// 对应类型包：@xunlei-open/miniapp-types
// 仅供查阅，不要复制到应用中替代正式类型依赖。

${source}`;

await writeFile(new URL(targetPath, root), expected);
console.log(`已同步 ${targetPath}`);
