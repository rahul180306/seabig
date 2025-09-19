#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const TARGET_DIRS = ['src'];
const CODE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.css']);
const PRESERVE_LINE_PAT = /(cspell:|eslint[- ]|@ts-|\/\*!|@license|@preserve)/i;
const PRESERVE_BLOCK_PAT = /(@license|@preserve|cspell:|eslint)/i;

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.next' || e.name === '.git') continue;
      walk(p);
    } else if (e.isFile()) {
      const ext = path.extname(e.name);
      if (CODE_EXTS.has(ext)) processFile(p, ext);
    }
  }
}

function stripBlockComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, (m) => (PRESERVE_BLOCK_PAT.test(m) ? m : ''));
}

function stripLineComments(src, ext) {
  if (ext === '.css') return src; 
  const lines = src.split(/\r?\n/);
  const out = lines.map((line) => {
    if (/^\s*\/\//.test(line) && !PRESERVE_LINE_PAT.test(line)) return '';
    return line;
  });
  return out.join('\n');
}

function cleanupBlankLines(src) {
  return src
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[\t ]+\n/g, '\n')
    .trimEnd() + '\n';
}

function processFile(filePath, ext) {
  try {
    const orig = fs.readFileSync(filePath, 'utf8');
    let s = orig;
    s = stripBlockComments(s);
    s = stripLineComments(s, ext);
    s = cleanupBlankLines(s);
    if (s !== orig) {
      fs.writeFileSync(filePath, s, 'utf8');
      console.log('Stripped comments:', path.relative(ROOT, filePath));
    }
  } catch (err) {
    console.error('Failed:', filePath, err.message);
  }
}

for (const d of TARGET_DIRS) {
  const p = path.join(ROOT, d);
  if (fs.existsSync(p)) walk(p);
}
console.log('Done.');
