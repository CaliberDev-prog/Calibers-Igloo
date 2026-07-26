import { readFile, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';

const FILE = join(process.cwd(), 'prefix.json');
const DEFAULT_PREFIX = '!';

async function load() {
  try {
    await access(FILE);
    const data = JSON.parse(await readFile(FILE, 'utf-8'));
    return data.prefix || DEFAULT_PREFIX;
  } catch {
    return DEFAULT_PREFIX;
  }
}

async function save(prefix) {
  try {
    await writeFile(FILE, JSON.stringify({ prefix }, null, 2));
  } catch (err) {
    console.error('[PREFIX] Failed to save:', err.message);
  }
}

let currentPrefix = '!';

load().then((p) => { currentPrefix = p; }).catch(() => {});

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
