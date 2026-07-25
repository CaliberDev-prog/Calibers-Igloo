import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const FILE = join(process.cwd(), 'prefix.json');
const DEFAULT_PREFIX = '!';

function load() {
  try {
    if (existsSync(FILE)) {
      const data = JSON.parse(readFileSync(FILE, 'utf-8'));
      return data.prefix || DEFAULT_PREFIX;
    }
  } catch {
    // fall through
  }
  return DEFAULT_PREFIX;
}

function save(prefix) {
  try {
    writeFileSync(FILE, JSON.stringify({ prefix }, null, 2));
  } catch (err) {
    console.error('[PREFIX] Failed to save:', err.message);
  }
}

let currentPrefix = load();

export function getPrefix() {
  return currentPrefix;
}

export function setPrefix(prefix) {
  currentPrefix = prefix;
  save(prefix);
}

export function clearPrefix() {
  currentPrefix = DEFAULT_PREFIX;
  save(DEFAULT_PREFIX);
}
