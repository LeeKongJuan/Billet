import crypto from 'crypto';
import { env } from '../config/env.js';

const PREFIX = 'billet:v1:';
const ALGORITHM = 'aes-256-gcm';

function loadKey() {
  if (env.DATA_ENCRYPTION_KEY) {
    const key = Buffer.from(env.DATA_ENCRYPTION_KEY, 'base64');
    if (key.length !== 32) {
      throw new Error('DATA_ENCRYPTION_KEY must be a base64-encoded 32-byte key');
    }
    return key;
  }

  if (env.NODE_ENV === 'production') {
    throw new Error('DATA_ENCRYPTION_KEY is required in production');
  }

  if (env.NODE_ENV !== 'test') {
    console.warn('DATA_ENCRYPTION_KEY is unset; deriving a development-only key from SESSION_SECRET.');
  }
  return Buffer.from(crypto.hkdfSync(
    'sha256',
    Buffer.from(env.SESSION_SECRET),
    Buffer.from('billet-dev-data-encryption'),
    Buffer.from('aes-256-gcm-v1'),
    32
  ));
}

const key = loadKey();

export function encryptSensitive(value) {
  if (value === null || value === undefined) return value;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(String(value), 'utf8'),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext.toString('base64')}`;
}

export function decryptSensitive(value) {
  if (value === null || value === undefined) return value;
  const serialized = Buffer.isBuffer(value) ? value.toString('utf8') : String(value);
  if (!serialized.startsWith(PREFIX)) return value;

  const [ivEncoded, authTagEncoded, ciphertextEncoded] = serialized.slice(PREFIX.length).split(':');
  if (!ivEncoded || !authTagEncoded || ciphertextEncoded === undefined) {
    throw new Error('Malformed encrypted Billet data');
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivEncoded, 'base64'));
  decipher.setAuthTag(Buffer.from(authTagEncoded, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextEncoded, 'base64')),
    decipher.final()
  ]).toString('utf8');
}

export function encryptMoney(value) {
  if (value === null || value === undefined) return value;
  return encryptSensitive(String(value));
}

export function decryptMoney(value) {
  if (value === null || value === undefined) return value;
  const clearValue = decryptSensitive(value);
  const amount = Number(clearValue);
  if (!Number.isSafeInteger(amount)) {
    throw new Error('Decrypted monetary value is not a safe integer');
  }
  return amount;
}

export function encryptJson(value) {
  if (value === null || value === undefined) return value;
  return encryptSensitive(JSON.stringify(value));
}

export function decryptJson(value) {
  if (value === null || value === undefined) return value;
  const clearValue = decryptSensitive(value);
  return typeof clearValue === 'string' ? JSON.parse(clearValue) : clearValue;
}

export function encryptRows(rows, moneyFields = [], textFields = []) {
  return rows.map((row) => {
    const encrypted = { ...row };
    for (const field of moneyFields) {
      if (encrypted[field] !== null && encrypted[field] !== undefined) {
        encrypted[field] = encryptMoney(encrypted[field]);
      }
    }
    for (const field of textFields) {
      if (encrypted[field] !== null && encrypted[field] !== undefined) {
        encrypted[field] = encryptSensitive(encrypted[field]);
      }
    }
    return encrypted;
  });
}

export function decryptRows(rows, moneyFields = [], textFields = []) {
  return rows.map((row) => {
    const decrypted = { ...row };
    for (const field of moneyFields) {
      if (decrypted[field] !== null && decrypted[field] !== undefined) {
        decrypted[field] = decryptMoney(decrypted[field]);
      }
    }
    for (const field of textFields) {
      if (decrypted[field] !== null && decrypted[field] !== undefined) {
        decrypted[field] = decryptSensitive(decrypted[field]);
      }
    }
    return decrypted;
  });
}