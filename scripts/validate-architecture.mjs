import fs from 'node:fs/promises';
import path from 'node:path';

const sourceDir = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve('site/assets');
const rules = [
  { file: 'views/home.js', forbidden: [/progress-models\//, /review-queue\.js/, /heatmap\.js/, /session-card\.js/] },
  { file: 'views/course.js', forbidden: [/review-queue\.js/, /heatmap\.js/, /session-card\.js/] },
  { file: 'views/progress.js', forbidden: [/progress-models\//, /views\/course\.js/] },
];

async function importsFor(relativePath) {
  const source = await fs.readFile(path.join(sourceDir, relativePath), 'utf8');
  return Array.from(source.matchAll(/from\s+['"]([^'"]+)['"]/g), (match) => match[1]);
}

for (const rule of rules) {
  const imports = await importsFor(rule.file);
  for (const specifier of imports) {
    for (const pattern of rule.forbidden) {
      if (pattern.test(specifier)) throw new Error(`${rule.file} must not import ${specifier}`);
    }
  }
}

for (const directory of ['components', 'progress-models']) {
  const names = await fs.readdir(path.join(sourceDir, directory));
  for (const name of names.filter((value) => value.endsWith('.js'))) {
    const imports = await importsFor(`${directory}/${name}`);
    if (imports.some((specifier) => specifier.includes('/views/'))) throw new Error(`${directory}/${name} must not import a view`);
  }
}

console.log('Pages architecture validation PASS');
