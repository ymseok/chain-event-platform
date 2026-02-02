import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { createHash, randomBytes } from 'crypto';
import path from 'path';
import type { ApiKey, StoredApiKey } from '@/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const API_KEYS_FILE = path.join(DATA_DIR, 'api-keys.json');

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

function loadKeys(): StoredApiKey[] {
  ensureDataDir();
  if (!existsSync(API_KEYS_FILE)) {
    return [];
  }
  try {
    const data = readFileSync(API_KEYS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveKeys(keys: StoredApiKey[]): void {
  ensureDataDir();
  writeFileSync(API_KEYS_FILE, JSON.stringify(keys, null, 2));
}

export function generateApiKey(): string {
  return randomBytes(32).toString('hex');
}

export function createApiKey(name: string): { keyData: ApiKey; fullKey: string } {
  const keys = loadKeys();
  const fullKey = generateApiKey();

  const keyData: StoredApiKey = {
    id: randomBytes(16).toString('hex'),
    name,
    keyPrefix: fullKey.substring(0, 8),
    keyHash: hashKey(fullKey),
    createdAt: new Date().toISOString(),
  };

  keys.push(keyData);
  saveKeys(keys);

  const { keyHash: _, ...publicKeyData } = keyData;
  return { keyData: publicKeyData, fullKey };
}

export function validateApiKey(key: string): boolean {
  const keys = loadKeys();
  const hash = hashKey(key);
  return keys.some((k) => k.keyHash === hash);
}

export function listApiKeys(): ApiKey[] {
  const keys = loadKeys();
  return keys.map(({ keyHash: _, ...rest }) => rest);
}

export function deleteApiKey(id: string): boolean {
  const keys = loadKeys();
  const filteredKeys = keys.filter((k) => k.id !== id);
  if (filteredKeys.length === keys.length) {
    return false;
  }
  saveKeys(filteredKeys);
  return true;
}

export function getApiKeyCount(): number {
  return loadKeys().length;
}
