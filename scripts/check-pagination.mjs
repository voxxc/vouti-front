#!/usr/bin/env node
/**
 * Preventive guard: flags `.from('table').select(...)` chains in src/ that
 * are NOT bounded by `.limit()`, `.range()`, `.single()`, `.maybeSingle()`,
 * `.csv()` or wrapped via `fetchAllPaginated` / `fetchAllPaginatedIn`.
 *
 * Run with `node scripts/check-pagination.mjs`. Exits 1 on findings so it
 * can be wired into CI/lint pipelines.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = 'src';
const EXTS = new Set(['.ts', '.tsx']);
const SAFE_TOKENS = ['.limit(', '.range(', '.single(', '.maybeSingle(', '.csv(', '.count(', 'fetchAllPaginated', 'fetchAllPaginatedIn'];
const IGNORE_FILES = ['supabasePagination.ts', 'integrations/supabase/types.ts'];

const findings = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else if (EXTS.has(extname(name)) && !IGNORE_FILES.some(f => p.endsWith(f))) scan(p);
  }
}

function scan(file) {
  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!/\.from\(['"`][a-zA-Z0-9_]+['"`]\)/.test(line)) continue;
    // Look ahead up to 12 lines for `.select(` and then check the chain window.
    const window = lines.slice(i, Math.min(lines.length, i + 14)).join('\n');
    if (!/\.select\(/.test(window)) continue;
    if (SAFE_TOKENS.some(tok => window.includes(tok))) continue;
    // Allow inserts/updates/deletes that also chain .select() — skipped only when
    // accompanied by `.insert(`, `.update(`, `.delete(`, `.upsert(` (single row).
    if (/\.(insert|update|delete|upsert)\(/.test(window)) continue;
    findings.push({ file, line: i + 1, snippet: line.trim() });
  }
}

walk(ROOT);

if (findings.length === 0) {
  console.log('✅ Pagination check passed — every .from(...).select(...) is bounded.');
  process.exit(0);
}

console.log(`⚠️  ${findings.length} unbounded SELECT(s) found. Wrap with fetchAllPaginated / .range / .limit / .single:`);
for (const f of findings) {
  console.log(`  ${f.file}:${f.line}  ${f.snippet}`);
}
process.exit(1);