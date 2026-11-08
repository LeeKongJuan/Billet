import { readFile } from 'fs/promises';
import { encryptMoney, encryptSensitive } from '../src/shared/encryption.js';

const FIELD_TYPES = {
  wallets: { balance: 'money' },
  wallet_transfers: { amount: 'money', note: 'text' },
  transactions: { name: 'text', amount: 'money', note: 'text' },
  budgets: { amount: 'money' },
  savings_goals: { target_amount: 'money', current_amount: 'money' },
  savings_goal_movements: { amount: 'money', note: 'text' },
  group_funds: { balance: 'money' },
  group_fund_goals: { target_amount: 'money' },
  group_fund_transactions: { amount: 'money', note: 'text' },
  bill_activities: { name: 'text', total_amount: 'money' },
  bill_activity_shares: { amount: 'money' },
  bill_settlements: { amount: 'money' },
  notifications: { content: 'text', data: 'json' }
};

export const config = { transaction: false };

function isEncrypted(value) {
  return String(value).startsWith('billet:v1:');
}

function encryptField(value, kind) {
  if (value === null || value === undefined || isEncrypted(value)) return value;
  if (kind === 'money') return encryptMoney(value);
  if (kind === 'json') {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    return encryptSensitive(serialized);
  }
  return encryptSensitive(value);
}

async function migrateData(knex) {
  for (const [tableName, columns] of Object.entries(FIELD_TYPES)) {
    const fields = Object.keys(columns);
    const rows = await knex(tableName).select('id', ...fields).orderBy('id');
    for (const row of rows) {
      const updates = {};
      for (const [field, kind] of Object.entries(columns)) {
        const encrypted = encryptField(row[field], kind);
        if (encrypted !== row[field]) updates[field] = encrypted;
      }
      if (Object.keys(updates).length > 0) {
        await knex(tableName).where({ id: row.id }).update(updates);
      }
    }
  }
}

async function alterSqliteColumns(knex) {
  await knex.raw('PRAGMA foreign_keys = OFF');
  try {
    for (const [tableName, columns] of Object.entries(FIELD_TYPES)) {
      await knex.schema.alterTable(tableName, (table) => {
        for (const [field, kind] of Object.entries(columns)) {
          const column = table.text(field);
          if (kind === 'text' && ['note', 'data'].includes(field)) column.nullable();
          else column.notNullable();
          column.alter();
        }
      });
    }
  } finally {
    await knex.raw('PRAGMA foreign_keys = ON');
  }
}

export async function up(knex) {
  if (knex.client.config.client === 'mysql2') {
    const sql = await readFile(new URL('./sql/20261108000000_encrypt_financial_fields.mysql.sql', import.meta.url), 'utf8');
    for (const statement of sql.split(';').map((item) => item.trim()).filter(Boolean)) {
      await knex.raw(statement);
    }
  } else {
    await alterSqliteColumns(knex);
  }

  await migrateData(knex);
}

export async function down() {
  throw new Error('AES-encrypted financial data migration is intentionally irreversible without the encryption key.');
}
