import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pagesDir = path.dirname(fileURLToPath(import.meta.url));
const sourceDir = process.argv[2] ? path.resolve(process.argv[2]) : path.join(pagesDir, 'src');
const activeEntrypoints = Object.freeze(['learning-studio/app.js', 'admin.js']);
const activeModules = new Set([...activeEntrypoints, 'data-provider.js', 'learning-studio/course-context.js', 'learning-studio/config-client.js']);

async function importsFor(relativePath) {
  const source = await fs.readFile(path.join(sourceDir, relativePath), 'utf8');
  return Array.from(source.matchAll(/from\s+['"]([^'"]+)['"]/g), (match) => match[1]);
}

for (const file of activeEntrypoints) {
  const imports = await importsFor(file);
  for (const specifier of imports) {
    if (!specifier.startsWith('.')) throw new Error(`${file} must not import external runtime ${specifier}`);
    const resolved = path.relative(sourceDir, path.resolve(sourceDir, path.dirname(file), specifier)).replaceAll('\\', '/');
    if (!activeModules.has(resolved)) throw new Error(`${file} imports inactive module ${resolved}`);
  }
}

console.log('Pages architecture validation PASS');
